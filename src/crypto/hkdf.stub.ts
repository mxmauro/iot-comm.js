import type { IHkdfCrypto } from './hkdf.interface';

// -----------------------------------------------------------------------------

// Creates the fallback HKDF crypto implementation for unsupported targets.
export const createHkdfCrypto = (): IHkdfCrypto => {
	throw new Error('Not implemented');
};
