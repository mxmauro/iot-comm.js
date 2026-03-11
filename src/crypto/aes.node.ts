import { createCipheriv, createDecipheriv } from 'node:crypto';
import { type InputBuffer, toArrayBuffer, toDataView } from '../utils/buffer';
import type { IAesCrypto } from './aes.interface';

// -----------------------------------------------------------------------------

export const createAesCrypto = (): IAesCrypto => {
	return new NodeAesCrypto();
};

// -----------------------------------------------------------------------------

class NodeAesCrypto implements IAesCrypto {
	private keyView?: DataView;

	public async setKey(key: InputBuffer): Promise<void> {
		this.keyView = toDataView(key);
		return Promise.resolve();
	}

	public async encrypt(plaintext: InputBuffer, iv: InputBuffer, aad?: DataView): Promise<ArrayBuffer> {
		if (!this.keyView) {
			throw new Error('Crypto key not set');
		}

		const cipher = createCipheriv('aes-256-gcm', this.keyView, toDataView(iv), {
			authTagLength: 16
		});
		if (aad) {
			cipher.setAAD(aad);
		}

		const encryptedParts: Buffer<ArrayBuffer>[] = [];
		encryptedParts.push(cipher.update(toDataView(plaintext)));
		encryptedParts.push(cipher.final());
		encryptedParts.push(cipher.getAuthTag());

		// Done
		return Promise.resolve(toArrayBuffer(encryptedParts));
	}

	public async decrypt(ciphertext: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer> {
		if (!this.keyView) {
			throw new Error('Crypto key not set');
		}

		if (ciphertext.byteLength < 16) {
			throw new Error('Invalid chiphered text');
		}
		const decipher = createDecipheriv('aes-256-gcm', this.keyView, toDataView(iv), {
			authTagLength: 16
		});
		if (aad) {
			decipher.setAAD(toDataView(aad));
		}

		ciphertext = toDataView(ciphertext);

		const encryptedPart = new DataView(ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength - 16));
		const authTag = new DataView(ciphertext.buffer.slice(ciphertext.byteOffset + ciphertext.byteLength - 16));

		decipher.setAuthTag(authTag);

		const decryptedParts: Buffer<ArrayBuffer>[] = [];
		decryptedParts.push(decipher.update(encryptedPart));
		decryptedParts.push(decipher.final());

		// Done
		return Promise.resolve(toArrayBuffer(decryptedParts));
	}
}
