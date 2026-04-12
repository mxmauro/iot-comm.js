import type { InputBuffer } from '../utils/buffer';

// -----------------------------------------------------------------------------

// Defines the HKDF key-derivation operation used by the protocol.
export interface IHkdfCrypto {
	deriveKey(key: InputBuffer, salt: InputBuffer, info: InputBuffer, keyLen: number): Promise<ArrayBuffer>;
}
