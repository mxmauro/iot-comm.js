import type { InputBuffer } from '../utils/buffer';

// -----------------------------------------------------------------------------

export interface IAesCrypto {
	deriveKey(key: InputBuffer, salt: InputBuffer, info: InputBuffer, keyLen: number): Promise<ArrayBuffer>;

	encrypt(plaintext: InputBuffer, key: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer>;
	decrypt(ciphertext: InputBuffer, key: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer>;
}
