import type { InputBuffer } from '../utils/buffer';

// -----------------------------------------------------------------------------

export interface IHkdfCrypto {
	deriveKey(key: InputBuffer, salt: InputBuffer, info: InputBuffer, keyLen: number): Promise<ArrayBuffer>;
}
