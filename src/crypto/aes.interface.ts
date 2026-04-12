import type { InputBuffer } from '../utils/buffer';

// -----------------------------------------------------------------------------

// Defines the AES operations required by the protocol implementation.
export interface IAesCrypto {
	setKey(key: InputBuffer): Promise<void>;

	encrypt(plaintext: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer>;
	decrypt(ciphertext: InputBuffer, iv: InputBuffer, aad?: InputBuffer): Promise<ArrayBuffer>;
}
