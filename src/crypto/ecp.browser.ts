import { fromB64 } from '../utils/base64';
import { type InputBuffer, toArrayBuffer, toArrayBufferView, toDataView } from '../utils/buffer';
import type { IECDHCrypto, IECDSACrypto } from './ecp.interface';

// -----------------------------------------------------------------------------

export const createECDSACrypto = (): IECDSACrypto => {
	return new BrowserECDSACrypto();
};

export const createECDHCrypto = (): IECDHCrypto => {
	return new BrowserECDHCrypto();
};

// -----------------------------------------------------------------------------

type BrowserEcpCryptoAlgorithm = 'ECDSA' | 'ECDH';

class BaseBrowserEcpCrypto {
	protected privKey?: CryptoKey;
	protected pubKey?: CryptoKey;

	protected constructor(protected algorithm: BrowserEcpCryptoAlgorithm) {}

	public async generateKeys(): Promise<void> {
		const keyPair = await crypto.subtle.generateKey(
			{
				name: this.algorithm,
				namedCurve: 'P-256'
			},
			true, // extractable
			this.algorithm === 'ECDSA' ? ['sign', 'verify'] : ['deriveKey', 'deriveBits']
		);

		this.privKey = keyPair.privateKey;
		this.pubKey = keyPair.publicKey;
	}

	public async loadRawPublicKey(pubKey: InputBuffer): Promise<void> {
		if (pubKey.byteLength !== 65) {
			throw new Error('Public key size must be 65 bytes');
		}
		const pubKeyView = toDataView(pubKey);
		if (pubKeyView.getUint8(0) !== 0x04) {
			throw new Error('Public key must be in uncompressed format (0x04 + x + y)');
		}

		this.pubKey = await crypto.subtle.importKey(
			'raw',
			toArrayBufferView(pubKey),
			{
				name: this.algorithm,
				namedCurve: 'P-256'
			},
			true,
			this.algorithm === 'ECDSA' ? ['verify'] : []
		);
	}

	public async loadRawPrivateKey(privKey: InputBuffer): Promise<void> {
		if (privKey.byteLength !== 32) {
			throw new Error('Private key size must be 32 bytes');
		}

		const pkcs8 = this.createPkcs8PrivateKey(privKey);

		// Import the encoded key
		this.privKey = await crypto.subtle.importKey(
			'pkcs8',
			pkcs8,
			{
				name: this.algorithm,
				namedCurve: 'P-256'
			},
			true,
			this.algorithm === 'ECDSA' ? ['sign'] : ['deriveKey', 'deriveBits']
		);
	}

	public async saveRawPublicKey(): Promise<ArrayBuffer> {
		if (!this.pubKey) {
			throw new Error('ECP public key not available.');
		}

		return await crypto.subtle.exportKey('raw', this.pubKey);
	}

	public async saveRawPrivateKey(): Promise<ArrayBuffer> {
		if (!this.privKey) {
			throw new Error('ECP private key not available.');
		}

		const jwk = await crypto.subtle.exportKey('jwk', this.privKey);
		if (!jwk.d) {
			throw new Error('Unable to export private key.');
		}

		// JWK 'd' parameter is base64url encoded
		const privateKeyBytes = fromB64(jwk.d, true);

		// Check length
		if (privateKeyBytes.byteLength !== 32) {
			throw new Error('Unexpected private key length.');
		}

		// Done
		return privateKeyBytes;
	}

	private createPkcs8PrivateKey(privKey: InputBuffer): ArrayBuffer {
		if (privKey.byteLength !== 32) {
			throw new Error('Private key size must be 32 bytes');
		}

		// PKCS#8 wrapper around SEC1 ECPrivateKey for P-256
		// biome-ignore format: preserve bytes meaning
		const pkcs8Prefix = Uint8Array.from([
			0x30, 0x4d, // SEQUENCE (length 77)
			0x02, 0x01, 0x00, // version
			0x30, 0x13,
			0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // ecPublicKey OID
			0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // prime256v1 OID
			0x04, 0x33, // OCTET STRING (length 51)
			0x30, 0x31, // ECPrivateKey sequence (length 49)
			0x02, 0x01, 0x01, // version
			0x04, 0x20 // private key OCTET STRING (length 32)
		]);
		// biome-ignore format: preserve bytes meaning
		const pkcs8Suffix = Uint8Array.from([
			0xa0, 0x0a, // [0] parameters
			0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07 // prime256v1 OID
		]);
		return toArrayBuffer([pkcs8Prefix, privKey, pkcs8Suffix]);
	}
}

class BrowserECDSACrypto extends BaseBrowserEcpCrypto {
	public constructor() {
		super('ECDSA');
	}

	public async sign(data: InputBuffer | InputBuffer[]): Promise<ArrayBuffer> {
		if (!this.privKey) {
			throw new Error('ECP private key is not available.');
		}

		return await crypto.subtle.sign(
			{
				name: 'ECDSA',
				hash: { name: 'SHA-256' }
			},
			this.privKey,
			toArrayBufferView(data)
		);
	}

	public async verify(data: InputBuffer | InputBuffer[], signature: InputBuffer): Promise<boolean> {
		if (!this.pubKey) {
			throw new Error('ECP public key is not available.');
		}

		return await crypto.subtle.verify(
			{
				name: 'ECDSA',
				hash: { name: 'SHA-256' }
			},
			this.pubKey,
			toArrayBufferView(signature),
			toArrayBufferView(data)
		);
	}
}

class BrowserECDHCrypto extends BaseBrowserEcpCrypto {
	public constructor() {
		super('ECDH');
	}

	async computeSharedSecret(): Promise<ArrayBuffer> {
		if (!(this.privKey && this.pubKey)) {
			throw new Error('ECP private and public keys are not available.');
		}

		return await crypto.subtle.deriveBits(
			{
				name: 'ECDH',
				public: this.pubKey
			},
			this.privKey,
			32 * 8 // bits
		);
	}
}
