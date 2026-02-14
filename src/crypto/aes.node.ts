import { createCipheriv, createDecipheriv } from 'node:crypto';
import { type InputBuffer, toArrayBuffer, toDataView } from '../utils/buffer';
import type { IAesCrypto } from './aes.interface';

// -----------------------------------------------------------------------------

export const createAesCrypto = (): IAesCrypto => {
	return new NodeAesCrypto();
};

// -----------------------------------------------------------------------------

class NodeAesCrypto implements IAesCrypto {
	public async encrypt(plaintext: InputBuffer, key: InputBuffer, iv: InputBuffer, aad?: DataView): Promise<ArrayBuffer> {
		return new Promise((resolve) => {
			const cipher = createCipheriv('aes-256-gcm', toDataView(key), toDataView(iv), {
				authTagLength: 16
			});
			if (aad) {
				cipher.setAAD(aad);
			}

			const encryptedParts = [];
			encryptedParts.push(cipher.update(toDataView(plaintext)));
			encryptedParts.push(cipher.final());
			encryptedParts.push(cipher.getAuthTag());

			// Done
			resolve(toArrayBuffer(encryptedParts));
		});
	}

	public async decrypt(ciphertext: InputBuffer, key: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer> {
		return new Promise((resolve) => {
			if (ciphertext.byteLength < 16) {
				throw new Error('Invalid chiphered text');
			}
			const decipher = createDecipheriv('aes-256-gcm', toDataView(key), toDataView(iv), {
				authTagLength: 16
			});
			if (aad) {
				decipher.setAAD(toDataView(aad));
			}

			ciphertext = toDataView(ciphertext);

			const encryptedPart = new DataView(
				ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength - 16)
			);
			const authTag = new DataView(ciphertext.buffer.slice(ciphertext.byteOffset + ciphertext.byteLength - 16));

			decipher.setAuthTag(authTag);

			const decryptedParts = [];
			decryptedParts.push(decipher.update(encryptedPart));
			decryptedParts.push(decipher.final());

			// Done
			resolve(toArrayBuffer(decryptedParts));
		});
	}
}
