import { type InputBuffer, toArrayBufferView } from '../utils/buffer';
import type { IAesCrypto } from './aes.interface';

// -----------------------------------------------------------------------------

export const createAesCrypto = (): IAesCrypto => {
	return new BrowserAesCrypto();
};

// -----------------------------------------------------------------------------

class BrowserAesCrypto implements IAesCrypto {
	private cryptoKey?: CryptoKey;

	public async setKey(key: InputBuffer): Promise<void> {
		this.cryptoKey = await crypto.subtle.importKey('raw', toArrayBufferView(key), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
	}

	public async encrypt(plaintext: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer> {
		if (!this.cryptoKey) {
			throw new Error('Crypto key not set');
		}

		const encrypted = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv: toArrayBufferView(iv),
				...(aad && { additionalData: aad }),
				tagLength: 16 * 8
			},
			this.cryptoKey,
			toArrayBufferView(plaintext)
		);

		return encrypted;
	}

	public async decrypt(ciphertext: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer> {
		if (!this.cryptoKey) {
			throw new Error('Crypto key not set');
		}

		const decrypted = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: toArrayBufferView(iv),
				...(aad && { additionalData: aad }),
				tagLength: 16 * 8
			},
			this.cryptoKey,
			toArrayBufferView(ciphertext)
		);

		return decrypted;
	}
}
