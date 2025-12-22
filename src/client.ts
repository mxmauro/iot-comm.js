import EventEmitter from 'eventemitter3';
import { createAesCrypto } from '@/crypto/aes';
import { createECDHCrypto, createECDSACrypto } from '@/crypto/ecp';
import { hash256 } from '@/crypto/hash';
import { randomize } from '@/crypto/random';
import { createWebSocket } from '@/ws';
import { ClientClosedError, CommandError } from './errors';
import { fromB64, toB64 } from './utils/base64';
import { type InputBuffer, toArrayBuffer, toDataView } from './utils/buffer';
import type { PromiseResolver } from './utils/promise';
import { isValidHostnameAndPort } from './utils/validation';
import type { CloseEvent, IWebSocket } from './ws/interface';
import { CLOSE_INTERNAL_ERROR, CLOSE_INVALID_PAYLOAD, CLOSE_NORMAL, CLOSED, OPEN } from './ws/interface';

export { hash256 } from '@/crypto/hash';
export { randomize } from '@/crypto/random';
export { generateKeyPair } from './utils';
export { fromB64, toB64 } from './utils/base64';

// -----------------------------------------------------------------------------

// biome-ignore format: preserve uppercase hex
const CMD_CREATE_USER = 0x7FF1;
//           name: NUL-terminated string
//     public key: raw 65-byte uncompressed ECDSA public key
//
// biome-ignore format: preserve uppercase hex
const CMD_DELETE_USER = 0x7FF2;
//     name: NUL-terminated string
//
// biome-ignore format: preserve uppercase hex
const CMD_RESET_USER_CREDENTIALS = 0x7FF3;
//               name: NUL-terminated string
//     new public key: raw 65-byte uncompressed ECDSA public key
//
// biome-ignore format: preserve uppercase hex
const CMD_CHANGE_USER_CREDENTIALS = 0x7FF4;
//     new public key: raw 65-byte uncompressed ECDSA public key
//
// biome-ignore format: preserve uppercase hex
const CMD_SET_MDNS_HOSTNAME = 0x7000;
//       hostname: NUL-terminated string

const VERSION = 1;
const PACKET_HEADER_LEN = 16; // bytes
const MAX_MSG_SIZE = 2000;

const COOKIE_SIZE = 12;
const NONCE_SIZE = 16;
const P256_PUBLIC_KEY_SIZE = 65;
const AES_KEY_LEN = 32;
const SESSION_IV_LEN = 12;

// -----------------------------------------------------------------------------

export type ClientEvents = {
	message: (data: ClientMessage) => void;
	close: (event: CloseEvent) => void;
};

type WaitingReplyElement = PromiseResolver<ArrayBuffer>;

type WaitingCloseElement = PromiseResolver<CloseEvent>;

type InitResponse = {
	token: string;
	serverNonce: string;
	serverPublicKey: string;
};

type AuthResponse = {
	wsNonce: string;
	mustChangeCredentials: boolean;
};

// -----------------------------------------------------------------------------

export const CloseReasonSessionNotFound = 4001;
export const CloseReasonCredentialsChangeMandatory = 4002;

// -----------------------------------------------------------------------------

export type ConnectOptions = {
	hostname: string;
	username: string;
	privateKey: InputBuffer | string;
};

export type ClientMessage = {
	cmd: number;
	data: ArrayBuffer;
};

// -----------------------------------------------------------------------------

export class Client {
	private emitter = new EventEmitter<ClientEvents>();
	private ws: IWebSocket | null = null;
	private closeCounter: number = 0;
	private _mustChangeCredentials = false;
	private aes = createAesCrypto();
	private clientAesKey = new ArrayBuffer();
	private serverAesKey = new ArrayBuffer();
	private clientBaseIV = new ArrayBuffer();
	private serverBaseIV = new ArrayBuffer();
	private wsNonce = new ArrayBuffer();
	private nextRxCounter: number = 0;
	private nextTxCounter: number = 0;
	private waitingReplyMap: Map<number, WaitingReplyElement> = new Map();
	private waitingCloseQueue: WaitingCloseElement[] = [];

	public async connect(opts: ConnectOptions): Promise<void> {
		const ecdsa = createECDSACrypto();
		const ecdh = createECDHCrypto();

		if (typeof opts !== 'object' || opts === null) {
			throw new Error('Options must be an object');
		}
		if (!isValidHostnameAndPort(opts.hostname)) {
			throw new Error('Invalid server hostname and port');
		}
		if (typeof opts.username !== 'string' || opts.username.length < 1 || opts.username.length > 255) {
			throw new Error('Invalid user name');
		}
		try {
			if (typeof opts.privateKey === 'string') {
				await ecdsa.loadRawPrivateKey(toDataView(fromB64(opts.privateKey)));
			} else {
				await ecdsa.loadRawPrivateKey(toDataView(opts.privateKey));
			}
		} catch (_err) {
			throw new Error('Invalid private key');
		}

		const baseUrl = `http://${opts.hostname}/`;

		// Close previous session if any
		await this.close();

		// Generate client nonce
		const clientNonce = randomize(NONCE_SIZE);

		// Generate client ECDH keypair
		await ecdh.generateKeys();
		const ecdhClientPublicKey = await ecdh.saveRawPublicKey();

		// Call INIT endpoint
		let response = await fetch(`${baseUrl}ws/init`, {
			method: 'POST',
			body: JSON.stringify({
				userName: opts.username,
				clientNonce: toB64(clientNonce),
				clientPublicKey: toB64(ecdhClientPublicKey)
			})
		});
		if (response.status !== 200) {
			throw new Error(`Unexpected status code ${response.status} received`);
		}

		// Parse response
		let cookie: ArrayBuffer;
		let serverNonce: ArrayBuffer;
		let ecdhServerPublicKey: ArrayBuffer;

		try {
			const initResponse = await (response.json() as Promise<InitResponse>);
			if (
				typeof initResponse.token !== 'string' ||
				typeof initResponse.serverNonce !== 'string' ||
				typeof initResponse.serverPublicKey !== 'string'
			) {
				throw new Error();
			}

			cookie = fromB64(initResponse.token);
			if (cookie.byteLength !== COOKIE_SIZE) {
				throw new Error();
			}
			ecdhServerPublicKey = fromB64(initResponse.serverPublicKey);
			if (ecdhServerPublicKey.byteLength !== P256_PUBLIC_KEY_SIZE) {
				throw new Error();
			}
			serverNonce = fromB64(initResponse.serverNonce);
			if (serverNonce.byteLength !== NONCE_SIZE) {
				throw new Error();
			}

			// Replace the public key of the ECDH with server's one
			// (we don't need the client public key anymore)
			await ecdh.loadRawPublicKey(ecdhServerPublicKey);
		} catch (_err) {
			throw new Error(`Invalid response from server`);
		}

		// Generate auth nonce
		const authNonce = randomize(NONCE_SIZE);

		// t = "ws-login-v1" || c_pk || s_pk || s_nonce || c_nonce || cookie || auth_nonce
		let t = [
			Buffer.from([0x77, 0x73, 0x2d, 0x6c, 0x6f, 0x67, 0x69, 0x6e, 0x2d, 0x76, 0x31]), // "ws-login-v1"
			ecdhServerPublicKey,
			ecdhClientPublicKey,
			serverNonce,
			clientNonce,
			cookie,
			authNonce
		];

		// Sign T (SHA-256 is applied internally)
		let signature = await ecdsa.sign(t);

		// Call AUTH endpoint
		response = await fetch(`${baseUrl}ws/auth`, {
			method: 'POST',
			body: JSON.stringify({
				token: toB64(cookie),
				authNonce: toB64(authNonce),
				signature: toB64(signature)
			})
		});
		if (response.status === 401) {
			throw new Error(`Authentication failed`);
		}
		if (response.status !== 200) {
			throw new Error(`Unexpected status code ${response.status} received`);
		}

		// Parse response
		let mustChangeCredentials: boolean;
		let wsNonce: ArrayBuffer;

		try {
			const authResponse = await (response.json() as Promise<AuthResponse>);
			if (typeof authResponse.mustChangeCredentials !== 'boolean' || typeof authResponse.wsNonce !== 'string') {
				throw new Error();
			}

			mustChangeCredentials = authResponse.mustChangeCredentials;
			wsNonce = fromB64(authResponse.wsNonce);
			if (wsNonce.byteLength !== NONCE_SIZE) {
				throw new Error();
			}
		} catch (_err) {
			throw new Error(`Invalid response from server`);
		}

		// Compute shared secret and derive keys
		const sharedSecret = await ecdh.computeSharedSecret();

		// Build info
		const info = toArrayBuffer([
			Buffer.from([0x6d, 0x78, 0x2d, 0x69, 0x6f, 0x74]), // "mx-iot"
			ecdhServerPublicKey,
			ecdhClientPublicKey
		]);

		// Build salt = SHA256("ws-login-v1" || s_nonce || c_nonce || cookie)
		const salt = await hash256([
			Buffer.from([0x77, 0x73, 0x2d, 0x6c, 0x6f, 0x67, 0x69, 0x6e, 0x2d, 0x76, 0x31]), // "ws-login-v1"
			serverNonce,
			clientNonce,
			cookie
		]);

		const derivedKey = await this.aes.deriveKey(toDataView(sharedSecret), salt, info, 2 * AES_KEY_LEN + 2 * SESSION_IV_LEN);

		const clientAesKey = derivedKey.slice(0, AES_KEY_LEN);
		const serverAesKey = derivedKey.slice(AES_KEY_LEN, 2 * AES_KEY_LEN);
		const clientBaseIV = derivedKey.slice(2 * AES_KEY_LEN, 2 * AES_KEY_LEN + SESSION_IV_LEN);
		const serverBaseIV = derivedKey.slice(2 * AES_KEY_LEN + SESSION_IV_LEN);

		// t = "ws-login-v1" || s_nonce || c_nonce || cookie || ws_nonce
		t = [
			Buffer.from([0x77, 0x73, 0x2d, 0x6c, 0x6f, 0x67, 0x69, 0x6e, 0x2d, 0x76, 0x31]), // "ws-login-v1"
			serverNonce,
			clientNonce,
			cookie,
			wsNonce
		];

		// Sign T (SHA-256 is applied internally)
		signature = await ecdsa.sign(t);

		// Create websocket and connect
		const ws = createWebSocket();
		await ws.connect({
			url: `${baseUrl}ws?token=${toB64(cookie, true)}&wsNonce=${toB64(wsNonce, true)}&signature=${toB64(signature, true)}`,
			timeoutMs: 10000
		});

		// Init internals
		this.waitingCloseQueue = [];
		this.waitingReplyMap = new Map();
		this._mustChangeCredentials = mustChangeCredentials;
		this.clientAesKey = clientAesKey;
		this.serverAesKey = serverAesKey;
		this.clientBaseIV = clientBaseIV;
		this.serverBaseIV = serverBaseIV;
		this.wsNonce = wsNonce;
		this.nextRxCounter = 1;
		this.nextTxCounter = 1;

		this.ws = ws;
		this.ws.on('message', (data) => this.onMessage(data));
		this.ws.on('close', (event) => this.onClose(event));
	}

	public get isConnected(): boolean {
		return !!(this.ws && this.ws.readyState === OPEN);
	}

	public get mustChangeCredentials(): boolean {
		return this._mustChangeCredentials;
	}

	public async sendCommand(cmd: number, data: InputBuffer | InputBuffer[]): Promise<void> {
		await this.encryptAndSend(cmd, data);
	}

	public async sendCommandAndWaitReply(cmd: number, data: InputBuffer | InputBuffer[]): Promise<ArrayBuffer> {
		const txCounter = await this.encryptAndSend(cmd, data);

		return new Promise<ArrayBuffer>((resolve, reject) => {
			this.waitingReplyMap.set(txCounter, { resolve, reject });
		});
	}

	public async createUserCommand(name: string, publicKey: InputBuffer): Promise<void> {
		if (typeof name !== 'string' || name.length < 1 || name.length > 255) {
			throw new Error('Invalid user name');
		}
		try {
			const ecdsa = createECDSACrypto();

			publicKey = toDataView(publicKey, 'Public key');
			if (publicKey.byteLength !== P256_PUBLIC_KEY_SIZE) {
				throw new Error();
			}
			ecdsa.loadRawPublicKey(publicKey);
		} catch (_err) {
			throw new Error('Invalid public key');
		}

		// Execute command
		// biome-ignore format: preserve uppercase hex
		const reply = await this.sendCommandAndWaitReply(
			CMD_CREATE_USER,
			[
				Buffer.from(`${name}`, 'utf8'),
				Buffer.from([0]),
				publicKey
			]
		);

		// Wait for server reply
		this.raiseReplyErrorIfAny(reply);
	}

	public async deleteUserCommand(name: string): Promise<void> {
		if (typeof name !== 'string' || name.length < 1 || name.length > 255) {
			throw new Error('Invalid user name');
		}

		// Execute command
		// biome-ignore format: preserve uppercase hex
		const reply = await this.sendCommandAndWaitReply(
			CMD_DELETE_USER,
			[
				Buffer.from(`${name}`, 'utf8'),
				Buffer.from([0])
			]
		);

		// Wait for server reply
		this.raiseReplyErrorIfAny(reply);
	}

	public async resetUserCredentialsCommand(name: string, publicKey: InputBuffer): Promise<void> {
		if (typeof name !== 'string' || name.length < 1 || name.length > 255) {
			throw new Error('Invalid user name');
		}
		try {
			const ecdsa = createECDSACrypto();

			publicKey = toDataView(publicKey, 'Public key');
			if (publicKey.byteLength !== P256_PUBLIC_KEY_SIZE) {
				throw new Error();
			}
			ecdsa.loadRawPublicKey(publicKey);
		} catch (_err) {
			throw new Error('Invalid public key');
		}

		// Execute command
		// biome-ignore format: preserve uppercase hex
		const reply = await this.sendCommandAndWaitReply(
			CMD_RESET_USER_CREDENTIALS,
			[
				Buffer.from(`${name}`, 'utf8'),
				Buffer.from([0]),
				publicKey
			]
		);

		// Wait for server reply
		this.raiseReplyErrorIfAny(reply);
	}

	public async changeUserCredentialsCommand(oldPrivateKey: InputBuffer | string, publicKey: InputBuffer | string): Promise<void> {
		const ecdsa = createECDSACrypto();

		try {
			if (typeof oldPrivateKey === 'string') {
				await ecdsa.loadRawPrivateKey(toDataView(fromB64(oldPrivateKey), 'Old private key'));
			} else {
				await ecdsa.loadRawPrivateKey(toDataView(oldPrivateKey, 'Old private key'));
			}
		} catch (_err) {
			throw new Error('Invalid old private key');
		}

		try {
			if (typeof publicKey === 'string') {
				publicKey = toDataView(fromB64(publicKey), 'Public key');
			} else {
				publicKey = toDataView(publicKey, 'Public key');
			}
			if (publicKey.byteLength !== P256_PUBLIC_KEY_SIZE) {
				throw new Error();
			}
			ecdsa.loadRawPublicKey(publicKey);
		} catch (_err) {
			throw new Error('Invalid public key');
		}

		// t = "ws-chgcreds-v1" || publicKey || ws_nonce
		const t = [
			Buffer.from([0x77, 0x73, 0x2d, 0x63, 0x68, 0x67, 0x63, 0x72, 0x65, 0x64, 0x73, 0x2d, 0x76, 0x31]), // "ws-chgcreds-v1"
			publicKey,
			this.wsNonce
		];

		// Sign T (SHA-256 is applied internally)
		const signature = await ecdsa.sign(t);

		// Execute command
		// biome-ignore format: preserve uppercase hex
		const reply = await this.sendCommandAndWaitReply(
			CMD_CHANGE_USER_CREDENTIALS,
			[
				signature,
				publicKey
			]
		);

		// Wait for server reply
		this.raiseReplyErrorIfAny(reply);

		// On success, mark the credentials change as completed
		this._mustChangeCredentials = false;
	}

	public async setHostnameCommand(hostname: string): Promise<void> {
		if (typeof hostname !== 'string' || hostname.length < 1 || hostname.length > 64) {
			throw new Error('Invalid hostname');
		}

		// Execute command
		// biome-ignore format: preserve uppercase hex
		const reply = await this.sendCommandAndWaitReply(
			CMD_SET_MDNS_HOSTNAME,
			[
				Buffer.from(`${hostname}`, 'utf8'),
				Buffer.from([0])
			]
		);

		// Wait for server reply
		this.raiseReplyErrorIfAny(reply);
	}

	public async close(code?: number, reason?: string): Promise<CloseEvent> {
		this.closeCounter += 1;

		// If not connected or already closed, return normal closure
		if (!this.ws || this.ws.readyState === CLOSED) {
			return Promise.resolve<CloseEvent>({
				code: CLOSE_NORMAL,
				reason: 'Already closed'
			});
		}

		// Add to waiting close queue
		const p = new Promise<CloseEvent>((resolve, reject) => {
			this.waitingCloseQueue.push({ resolve, reject });
		});

		// Close WebSocket
		this.ws.close(code, reason);

		// Done
		return p;
	}

	public on<K extends keyof ClientEvents>(event: K, handler: ClientEvents[K]): this {
		this.emitter.on(event, handler as EventEmitter.EventListener<ClientEvents, K>);
		return this;
	}

	public off<K extends keyof ClientEvents>(event: K, handler: ClientEvents[K]): this {
		this.emitter.off(event, handler as EventEmitter.EventListener<ClientEvents, K>);
		return this;
	}

	public once<K extends keyof ClientEvents>(event: K, handler: ClientEvents[K]): this {
		this.emitter.once(event, handler as EventEmitter.EventListener<ClientEvents, K>);
		return this;
	}

	private async encryptAndSend(cmd: number, data: InputBuffer | InputBuffer[]): Promise<number> {
		if (!this.ws || this.ws.readyState !== OPEN) {
			throw new Error('WebSocket is not connected');
		}

		data = toDataView(data, 'Data');
		const txCounter = this.nextTxCounter;

		// Check data size
		if (data.byteLength > MAX_MSG_SIZE) {
			throw new Error(`Data too long (max ${MAX_MSG_SIZE} bytes)`);
		}

		// Header { v(1) | cmd(2) | filler(1) | replyCounter(4) | counter(4) | filler(4) }
		const header = Buffer.alloc(PACKET_HEADER_LEN);
		header.writeUInt8(VERSION, 0); // v
		header.writeUInt16BE(cmd, 1); //cmd
		header.writeUInt8(0, 3); //filler1
		header.writeUInt32BE(0, 4); //reply counter
		header.writeUInt32BE(txCounter, 8); // counter
		header.writeUInt32BE(0, 12); // filler2

		// Build IV
		const iv = new Uint8Array(new Uint8Array(this.clientBaseIV));
		for (let i = 0; i < 4; i++) {
			iv[SESSION_IV_LEN - i - 1] ^= (txCounter >> (i << 3)) & 0xff;
		}

		// Encrypt data
		const encrypted = await this.aes.encrypt(data, this.clientAesKey, iv);

		// Send it
		this.ws.send(Buffer.concat([header, new Uint8Array(encrypted)]));

		// Increment write counter
		this.nextTxCounter += 1;

		// Done
		return txCounter;
	}

	private onMessage(data: string | ArrayBuffer): void {
		// Ignore messages if we are not connected
		if (!this.ws || this.ws.readyState !== OPEN) {
			return;
		}

		// Only binary packets are allowed
		if (!(data instanceof ArrayBuffer)) {
			this.close(CLOSE_INVALID_PAYLOAD, 'Protocol error: non-binary packet');
			return;
		}

		// Check message size
		if (data.byteLength < PACKET_HEADER_LEN) {
			// Packet too short to contain header + tag
			this.close(CLOSE_INVALID_PAYLOAD, 'Protocol error: packet too short');
			return;
		}
		if (data.byteLength > PACKET_HEADER_LEN + MAX_MSG_SIZE + 32) {
			// Packet too short to contain header + tag
			this.close(CLOSE_INVALID_PAYLOAD, 'Protocol error: packet too long');
			return;
		}

		// Extract header and validate version and RX counter (a.k.a. nonce)
		// Header { v(1) | cmd(2) | filler(1) | replyCounter(4) | counter(4) | filler(4) }
		const headerView = new DataView(data, 0, PACKET_HEADER_LEN);
		const version = headerView.getUint8(0);
		const cmd = headerView.getUint16(1, false); // big-endian
		const replyCounter = headerView.getUint32(4, false); // big-endian
		const rxCounter = headerView.getUint32(8, false); // big-endian

		if (version !== VERSION) {
			// Unsupported version
			this.close(CLOSE_INVALID_PAYLOAD, 'Protocol error: unsupported version');
			return;
		}
		if (rxCounter !== this.nextRxCounter) {
			// Invalid RX counter
			this.close(CLOSE_INVALID_PAYLOAD, 'Protocol error: RX counter mismatch');
			return;
		}
		this.nextRxCounter += 1;

		// Build IV
		const iv = new Uint8Array(new Uint8Array(this.serverBaseIV));
		for (let i = 0; i < 4; i++) {
			iv[SESSION_IV_LEN - i - 1] ^= (rxCounter >> (i << 3)) & 0xff;
		}

		// Try to decrypt
		const ciphertextView = new DataView(data, PACKET_HEADER_LEN, data.byteLength - PACKET_HEADER_LEN);
		const thisCloseCounter = this.closeCounter;
		this.aes
			.decrypt(ciphertextView, this.serverAesKey, iv)
			.then((plaintext) => {
				if (thisCloseCounter === this.closeCounter) {
					// Process message
					try {
						// If we are still alive
						if (this.ws) {
							this.onCommand(cmd, plaintext, replyCounter);
						}
					} catch (_err) {
						this.close(CLOSE_INTERNAL_ERROR, 'Unhandled error');
					}
				}
			})
			.catch((_err) => {
				// Decryption/authentication failed
				if (thisCloseCounter === this.closeCounter) {
					this.close(CLOSE_INVALID_PAYLOAD, 'Protocol error: decryption/authentication failed');
				}
				return;
			});
	}

	private onCommand(cmd: number, data: ArrayBuffer, replyCounter: number): void {
		if (replyCounter !== 0) {
			const p = this.waitingReplyMap.get(replyCounter);
			if (p) {
				this.waitingReplyMap.delete(replyCounter);
				p.resolve(data);
				return;
			}
		} else {
			this.emitter.emit('message', { cmd, data });
		}
	}

	private onClose(event: CloseEvent): void {
		this.ws = null;
		this.cancelAllWaitingReply(event);
		this.resolveAllWaitingClose(event);

		this.emitter.emit('close', event);
	}

	private resolveAllWaitingClose(event: CloseEvent): void {
		for (;;) {
			const p = this.waitingCloseQueue.pop();
			if (!p) {
				break;
			}
			p.resolve(event);
		}
	}

	private cancelAllWaitingReply(event: CloseEvent): void {
		const m = this.waitingReplyMap;
		this.waitingReplyMap = new Map();

		const err = new ClientClosedError(event);
		m.forEach((p) => {
			p.reject(err);
		});
	}

	private raiseReplyErrorIfAny(buf: ArrayBuffer) {
		const bufView = new DataView(buf);
		const utf8Decoder = new TextDecoder('utf-8');

		// Extract code
		const code = bufView.getUint32(0, false);
		if (code === 0) {
			return;
		}

		// Extract message
		let length = 0;
		while (4 + length < bufView.byteLength && bufView.getUint8(4 + length) !== 0) {
			length++;
		}
		let message = utf8Decoder.decode(new Uint8Array(bufView.buffer, bufView.byteOffset + 4, length));
		if (!message) {
			message = 'N/A';
		}

		// Done
		throw new CommandError(code, message);
	}
}
