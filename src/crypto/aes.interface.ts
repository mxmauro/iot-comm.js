import type { InputBuffer } from '../utils/buffer';

// -----------------------------------------------------------------------------

export interface IAesCrypto {
	encrypt(plaintext: InputBuffer, key: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer>;
	decrypt(ciphertext: InputBuffer, key: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer>;
}
