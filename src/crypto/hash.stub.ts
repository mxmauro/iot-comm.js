import type { InputBuffer } from '../utils/buffer';

// -----------------------------------------------------------------------------

// Computes a SHA-256 digest using the fallback unsupported-target implementation.
export const hash256 = async (_data: InputBuffer[]): Promise<ArrayBuffer> => {
	throw new Error('Not implemented');
};
