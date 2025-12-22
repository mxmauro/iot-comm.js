import {
	createPrivateKey,
	createPublicKey,
	sign as cryptoSign,
	verify as cryptoVerify,
	diffieHellman,
	generateKeyPair,
	type KeyObject
} from 'node:crypto';
import { promisify } from 'node:util';
import { type InputBuffer, toArrayBuffer, toDataView } from '../utils/buffer';
import type { IECDHCrypto, IECDSACrypto } from './ecp.interface';

// -----------------------------------------------------------------------------

const generateKeyPairAsync = promisify(generateKeyPair);
const cryptoSignAsync = promisify(cryptoSign);
const cryptoVerifyAsync = promisify(cryptoVerify);
const diffieHellmanAsync = promisify(diffieHellman);

// -----------------------------------------------------------------------------

export const createECDSACrypto = (): IECDSACrypto => {
	return new NodeECDSACrypto();
};

export const createECDHCrypto = (): IECDHCrypto => {
	return new NodeECDHCrypto();
};

// -----------------------------------------------------------------------------

class BaseNodeEcpCrypto {
	protected privKey?: KeyObject;
	protected pubKey?: KeyObject;

	public async generateKeys(): Promise<void> {
		const { privateKey, publicKey } = await generateKeyPairAsync('ec', {
			namedCurve: 'prime256v1' //secp256r1
		});

		this.privKey = privateKey;
		this.pubKey = publicKey;
	}

	public async loadRawPublicKey(pubKey: InputBuffer): Promise<void> {
		return new Promise((resolve) => {
			if (pubKey.byteLength !== 65) {
				throw new Error('Public key size must be 65 bytes');
			}
			const pubKeyView = toDataView(pubKey);
			if (pubKeyView.getUint8(0) !== 0x04) {
				throw new Error('Public key must be in uncompressed format (0x04 + x + y)');
			}

			// Create DER-encoded SubjectPublicKeyInfo structure
			const der = this.createPublicKeyDER(pubKeyView);
			this.pubKey = createPublicKey({
				key: der,
				format: 'der',
				type: 'spki'
			});
			resolve();
		});
	}

	public async loadRawPrivateKey(privKey: InputBuffer): Promise<void> {
		return new Promise((resolve) => {
			if (privKey.byteLength !== 32) {
				throw new Error('Private key size must be 32 bytes');
			}
			const privKeyView = toDataView(privKey);

			// Create SEC1 DER-encoded private key
			const der = this.createPrivateKeyDER(privKeyView);
			this.privKey = createPrivateKey({
				key: der,
				format: 'der',
				type: 'sec1'
			});
			resolve();
		});
	}

	public async saveRawPublicKey(): Promise<ArrayBuffer> {
		return new Promise((resolve) => {
			if (!this.pubKey) {
				throw new Error('ECP public key not available.');
			}

			const publicKeyDer = this.pubKey.export({
				type: 'spki',
				format: 'der'
			});
			// Extract the uncompressed point from DER format (last 65 bytes)
			resolve(toArrayBuffer([publicKeyDer.subarray(-65)]));
		});
	}

	public async saveRawPrivateKey(): Promise<ArrayBuffer> {
		return new Promise((resolve) => {
			if (!this.privKey) {
				throw new Error('ECP private key not available.');
			}

			const privateKeyDer = this.privKey.export({
				type: 'sec1',
				format: 'der'
			});
			// Extract the 32-byte private key from SEC1 DER format
			// SEC1 format: SEQUENCE { version, privateKey, ... }
			// The private key is an OCTET STRING after the version
			const privateKeyIndex = privateKeyDer.indexOf(0x04, 5); // Find OCTET STRING tag
			if (privateKeyIndex === -1 || privateKeyDer[privateKeyIndex + 1] !== 32) {
				throw new Error('Invalid private key format');
			}
			resolve(toArrayBuffer([privateKeyDer.subarray(privateKeyIndex + 2, privateKeyIndex + 34)]));
		});
	}

	private createPublicKeyDER(pubKeyView: DataView): Buffer {
		return Buffer.concat([
			Buffer.from([0x30, 0x59]), // SEQUENCE length 89 bytes
			Buffer.from([0x30, 0x13]), // SEQUENCE (length 2+19 bytes)
			Buffer.from([0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01]), // OID ecPublicKey (length 2+7 bytes)
			Buffer.from([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]), //OID for secp256r1 (length 2+8 bytes)
			// bit string
			Buffer.from([0x03, 0x42, 0x00]), // BIT STRING, length 65 + 1 for the no unused bits
			Buffer.from(pubKeyView.buffer, pubKeyView.byteOffset, pubKeyView.byteLength) // byteLength must be 65
		]);
	}

	private createPrivateKeyDER(privKeyView: DataView): Buffer {
		// SEC1 format: SEQUENCE { version, privateKey OCTET STRING, [0] curve OID }
		return Buffer.concat([
			Buffer.from([0x30, 0x31]), // SEQUENCE (length 49 bytes)
			Buffer.from([0x02, 0x01, 0x01]), // version INTEGER 1
			Buffer.from([0x04, 0x20]), // OCTET STRING, length 32
			Buffer.from(privKeyView.buffer, privKeyView.byteOffset, privKeyView.byteLength), // byteLength must be 32
			Buffer.from([0xa0, 0x0a]), // CONTEXT SPECIFIC [0]
			Buffer.from([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07])
		]);
	}
}

class NodeECDSACrypto extends BaseNodeEcpCrypto {
	public async sign(data: InputBuffer | InputBuffer[]): Promise<ArrayBuffer> {
		if (!this.privKey) {
			throw new Error('ECP private key is not available.');
		}

		if (Array.isArray(data)) {
			data = toArrayBuffer(data);
		}
		const signature = await cryptoSignAsync('sha-256', toDataView(data), { key: this.privKey, dsaEncoding: 'ieee-p1363' });
		return toArrayBuffer([signature]);
	}

	public async verify(data: InputBuffer | InputBuffer[], signature: InputBuffer): Promise<boolean> {
		if (!this.pubKey) {
			throw new Error('ECP public key is not available.');
		}
		if (Array.isArray(data)) {
			data = toArrayBuffer(data);
		}
		return cryptoVerifyAsync('sha-256', toDataView(data), { key: this.pubKey, dsaEncoding: 'ieee-p1363' }, toDataView(signature));
	}
}

class NodeECDHCrypto extends BaseNodeEcpCrypto {
	public async computeSharedSecret(): Promise<ArrayBuffer> {
		if (!(this.privKey && this.pubKey)) {
			throw new Error('ECP private and public keys are not available.');
		}

		const sharedSecret = await diffieHellmanAsync({
			privateKey: this.privKey,
			publicKey: this.pubKey
		});
		return toArrayBuffer([sharedSecret]);
	}
}
