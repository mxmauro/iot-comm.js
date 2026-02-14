import { type InputBuffer, toArrayBufferView } from '../utils/buffer';
import type { IHkdfCrypto } from './hkdf.interface';

// -----------------------------------------------------------------------------

export const createHkdfCrypto = (): IHkdfCrypto => {
	return new BrowserHkdfCrypto();
};

// -----------------------------------------------------------------------------

class BrowserHkdfCrypto implements IHkdfCrypto {
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
}
