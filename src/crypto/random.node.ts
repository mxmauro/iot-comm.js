import { randomBytes } from 'node:crypto';

// -----------------------------------------------------------------------------

export const randomize = (len: number): ArrayBuffer => {
	const buf = randomBytes(len);
	return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};
