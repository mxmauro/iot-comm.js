import { type InputBuffer, toDataView } from './buffer';

// -----------------------------------------------------------------------------

// Encodes binary data as HEX text.
export const toHex = (buffer: InputBuffer): string => {
	let str = '';

	const bufferView = toDataView(buffer);
	for (let i = 0; i < bufferView.byteLength; i++) {
		str += bufferView.getUint8(i).toString(16).padStart(2, '0');
	}
	return str;
};
