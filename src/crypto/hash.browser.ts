import { type InputBuffer, toArrayBuffer } from '../utils/buffer';

// -----------------------------------------------------------------------------

export const hash256 = async (data: InputBuffer[]): Promise<ArrayBuffer> => {
	const hash = await crypto.subtle.digest('SHA-256', toArrayBuffer(data));
	return hash;
};
