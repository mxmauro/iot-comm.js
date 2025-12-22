import { type InputBuffer, toArrayBufferView } from '../utils/buffer';
import type { IAesCrypto } from './aes.interface';

// -----------------------------------------------------------------------------

export const createAesCrypto = (): IAesCrypto => {
	return new BrowserAesCrypto();
};

// -----------------------------------------------------------------------------

class BrowserAesCrypto implements IAesCrypto {
	public async deriveKey(key: InputBuffer, salt: InputBuffer, info: InputBuffer, keyLen: number): Promise<ArrayBuffer> {
		const baseKey = await crypto.subtle.importKey('raw', toArrayBufferView(key), 'HKDF', false, ['deriveBits']);

		// Derive bits using HKDF
		const derivedBits = await crypto.subtle.deriveBits(
			{
				name: 'HKDF',
				hash: 'sha-256',
				salt: toArrayBufferView(salt),
				info: toArrayBufferView(info)
			},
			baseKey,
			keyLen * 8 // length in bits
		);

		return derivedBits;
	}

	public async encrypt(plaintext: InputBuffer, key: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer> {
		const cryptoKey = await crypto.subtle.importKey('raw', toArrayBufferView(key), { name: 'AES-GCM' }, false, ['encrypt']);

		const encrypted = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv: toArrayBufferView(iv),
				...(aad && { additionalData: aad }),
				tagLength: 16 * 8
			},
			cryptoKey,
			toArrayBufferView(plaintext)
		);

		return encrypted;
	}

	public async decrypt(ciphertext: InputBuffer, key: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer> {
		const cryptoKey = await crypto.subtle.importKey('raw', toArrayBufferView(key), { name: 'AES-GCM' }, false, ['decrypt']);

		const decrypted = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: toArrayBufferView(iv),
				...(aad && { additionalData: aad }),
				tagLength: 16 * 8
			},
			cryptoKey,
			toArrayBufferView(ciphertext)
		);

		return decrypted;
	}
}
