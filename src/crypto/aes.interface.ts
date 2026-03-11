import type { InputBuffer } from '../utils/buffer';

// -----------------------------------------------------------------------------

export interface IAesCrypto {
	setKey(key: InputBuffer): Promise<void>;

	encrypt(plaintext: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer>;
	decrypt(ciphertext: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer>;
}
