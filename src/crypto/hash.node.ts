import { createHash } from 'node:crypto';
import { type InputBuffer, toDataView } from '../utils/buffer';

// -----------------------------------------------------------------------------

export const hash256 = async (data: InputBuffer[]): Promise<ArrayBuffer> => {
	return new Promise((resolve) => {
		const h = createHash('sha256');
		data.forEach((buf) => {
			h.update(toDataView(buf));
		});
		const hash = h.digest();
		resolve(hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength) as ArrayBuffer);
	});
};
