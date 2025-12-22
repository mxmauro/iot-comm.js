export type InputBuffer = DataView | ArrayBuffer | Buffer | Uint8Array;

// -----------------------------------------------------------------------------

export const toDataView = (data: InputBuffer | InputBuffer[], varName?: string): DataView => {
	if (typeof data !== 'undefined') {
		if (Array.isArray(data)) {
			return new DataView(toArrayBuffer(data));
		}
		if (data instanceof DataView) {
			return data;
		}
		if (data instanceof Uint8Array) {
			const buf = data as Uint8Array;
			return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
		}
		if (Buffer.isBuffer(data)) {
			const buf = data as Buffer;
			return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
		}
		if (data instanceof ArrayBuffer) {
			return new DataView(data);
		}
	}
	if (varName) {
		throw new TypeError(`${varName} is an unsupported input type`);
	}
	throw new TypeError('Unsupported input type');
};

export const toArrayBufferView = (src: InputBuffer | InputBuffer[]): ArrayBufferView<ArrayBuffer> => {
	if (Array.isArray(src)) {
		return new Uint8Array(toArrayBuffer(src));
	}
	if (src instanceof Uint8Array) {
		return new Uint8Array(src);
	}
	if (src instanceof ArrayBuffer) {
		return new Uint8Array(src);
	}
	if (src instanceof Buffer) {
		return new Uint8Array(src);
	}
	if (src instanceof DataView) {
		return new Uint8Array(Buffer.from(src.buffer, src.byteOffset, src.byteLength));
	}
	throw new TypeError('Unsupported input type');
};

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
		if (buf instanceof Uint8Array) {
			destView.set(buf, ofs);
		} else if (buf instanceof ArrayBuffer) {
			destView.set(new Uint8Array(buf), ofs);
		} else if (buf instanceof Buffer) {
			destView.set(new Uint8Array(buf), ofs);
		} else if (buf instanceof DataView) {
			destView.set(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength), ofs);
		} else {
			throw new TypeError('Unsupported input type');
		}
		ofs += buf.byteLength;
	});

	return dest;
};

export const stringToNulTerminatedBuffer = (s: string): Buffer => {
	return Buffer.concat([Buffer.from(`${s}`, 'utf8'), Buffer.from([0])]);
};
