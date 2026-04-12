// Lists the binary input shapes accepted by the library helpers and commands.
export type InputBuffer = DataView | ArrayBuffer | Buffer | Uint8Array;

// -----------------------------------------------------------------------------

const isNodeBuffer = (data: unknown): data is Buffer => {
	return typeof Buffer !== 'undefined' && Buffer.isBuffer(data);
};

const isArrayBuffer = (data: unknown): data is ArrayBuffer => {
	return Object.prototype.toString.call(data) === '[object ArrayBuffer]';
};

const isDataView = (data: unknown): data is DataView => {
	return ArrayBuffer.isView(data) && Object.prototype.toString.call(data) === '[object DataView]';
};

const isUint8Array = (data: unknown): data is Uint8Array => {
	return ArrayBuffer.isView(data) && Object.prototype.toString.call(data) === '[object Uint8Array]';
};

// Normalizes supported binary inputs into a DataView.
export const toDataView = (data: InputBuffer | InputBuffer[], varName?: string): DataView => {
	if (typeof data !== 'undefined') {
		if (Array.isArray(data)) {
			return new DataView(toArrayBuffer(data));
		}
		if (isDataView(data)) {
			return data;
		}
		if (isNodeBuffer(data) || isUint8Array(data)) {
			const buf = data as Uint8Array;
			return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
		}
		if (isArrayBuffer(data)) {
			return new DataView(data);
		}
	}
	if (varName) {
		throw new TypeError(`${varName} is an unsupported input type`);
	}
	throw new TypeError('Unsupported input type');
};

// Normalizes supported binary inputs into an ArrayBufferView.
export const toArrayBufferView = (src: InputBuffer | InputBuffer[]): ArrayBufferView<ArrayBuffer> => {
	if (Array.isArray(src)) {
		return new Uint8Array(toArrayBuffer(src));
	}
	if (isNodeBuffer(src) || isUint8Array(src)) {
		return new Uint8Array(src);
	}
	if (isArrayBuffer(src)) {
		return new Uint8Array(src);
	}
	if (isDataView(src)) {
		return new Uint8Array(toArrayBuffer(src));
	}
	throw new TypeError('Unsupported input type');
};

// Copies supported binary inputs into a single ArrayBuffer.
export const toArrayBuffer = (src: InputBuffer | InputBuffer[]): ArrayBuffer => {
	if (!Array.isArray(src)) {
		src = [src];
	}

	let size = 0;
	src.forEach((buf) => {
		size += buf.byteLength;
	});
	const dest = new ArrayBuffer(size);
	const destView = new Uint8Array(dest);
	let ofs = 0;

	src.forEach((buf) => {
		if (isNodeBuffer(buf) || isUint8Array(buf)) {
			destView.set(buf, ofs);
		} else if (isArrayBuffer(buf)) {
			destView.set(new Uint8Array(buf), ofs);
		} else if (isDataView(buf)) {
			destView.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), ofs);
		} else {
			throw new TypeError('Unsupported input type');
		}
		ofs += buf.byteLength;
	});

	return dest;
};

// Returns the byte length of a supported binary input.
export const getInputBufferSize = (data: InputBuffer, varName?: string): number => {
	return toDataView(data, varName).byteLength;
};

// Splits a binary input into sequential chunks of the requested size.
export async function* chunkInputBuffer(data: InputBuffer, chunkSize: number): AsyncGenerator<Uint8Array> {
	const view = new Uint8Array(toArrayBuffer(data));
	for (let offset = 0; offset < view.byteLength; offset += chunkSize) {
		yield view.slice(offset, Math.min(offset + chunkSize, view.byteLength));
	}
}

// Encodes a UTF-8 string with a trailing NUL byte.
export const stringToNulTerminatedBuffer = (s: string): Buffer => {
	return Buffer.concat([Buffer.from(`${s}`, 'utf8'), Buffer.from([0])]);
};
