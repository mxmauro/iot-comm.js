import { type InputBuffer, toDataView } from './buffer';

const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

// -----------------------------------------------------------------------------

export const toB64 = (buffer: InputBuffer, url?: boolean): string => {
	let base64: string;
	let binary = '';

	const bufferView = toDataView(buffer);
	for (let i = 0; i < bufferView.byteLength; i++) {
		binary += String.fromCharCode(bufferView.getUint8(i));
	}

	if (typeof btoa !== 'undefined') {
		base64 = btoa(binary); // Browser
	} else {
		// NodeJS
		base64 = Buffer.from(binary, 'binary').toString('base64');
	}
	if (url) {
		base64 = base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
	}
	return base64;
};

export const fromB64 = (base64: string, url?: boolean): ArrayBuffer => {
	let binary: string;

	if (url) {
		base64 = base64.replaceAll('-', '+').replaceAll('_', '/');
	}
	const padding = '='.repeat((4 - (base64.length % 4)) % 4);
	base64 += padding;

	if (typeof atob !== 'undefined') {
		binary = atob(base64); // Browser
	} else {
		// NodeJS is more relaxed in terms of validation so let's do manually
		if (!base64Regex.test(base64) || base64.length % 4 !== 0) {
			throw new Error('Invalid Base64 string');
		}
		binary = Buffer.from(base64, 'base64').toString('binary');
	}

	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
};
