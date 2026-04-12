import type { IAesCrypto } from './aes.interface';

// -----------------------------------------------------------------------------

// Creates the fallback AES crypto implementation for unsupported targets.
export const createAesCrypto = (): IAesCrypto => {
	throw new Error('Not implemented');
};
