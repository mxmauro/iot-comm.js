import { randomBytes } from 'node:crypto';

// -----------------------------------------------------------------------------

// Generates cryptographically secure random bytes in Node.js environments.
export const randomize = (len: number): ArrayBuffer => {
	const buf = randomBytes(len);
	return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};
