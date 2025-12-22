export const b64ToArrayBuffer = (base64) => {
	if (typeof base64 !== 'string') {
		throw new TypeError('Input must be a base64 string');
	}

	// Normalize padding
	base64 = base64.trim();
	const missingPadding = base64.length % 4;
	if (missingPadding) {
		base64 += '='.repeat(4 - missingPadding);
	}

	// Basic sanity check
	if (!/^[A-Za-z0-9+/=_-]*$/.test(base64)) {
		throw new Error('Invalid base64 characters');
	}

	// Convert URL-safe to standard
	base64 = base64.replace(/-/g, '+').replace(/_/g, '/');

	// Convert
	let binary;
	try {
		binary = atob(base64);
	} catch {
		throw new Error('Invalid base64 string');
	}

	// Convert string to ArrayBuffer
	const buf = new ArrayBuffer(binary.length);
	const bufView = new Uint8Array(buf);
	for (let i = 0; i < binary.length; i++) {
		bufView[i] = binary.charCodeAt(i);
	}

	// Done
	return buf;
};
