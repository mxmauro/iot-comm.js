import { fromB64 } from './base64';
import { type InputBuffer, toDataView } from './buffer';

// -----------------------------------------------------------------------------

// Validates a hostname string with or without an explicit port.
export const isValidHostname = (str: string): boolean => {
	if (typeof str !== 'string' || str.length < 1) {
		return false;
	}
	if (/:(\d+)?$/.test(str)) {
		return false;
	}
	return isValidHostnameAndPort(str);
};

// Validates a hostname string that may include a port number.
export const isValidHostnameAndPort = (str: string): boolean => {
	if (typeof str !== 'string' || str.length < 1) {
		return false;
	}

	try {
		const url = new URL(`http://${str}/`);

		// reject if any part other than hostname or port is present
		if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
			return false;
		}

		// host must exist
		if (!url.hostname) {
			return false;
		}

		// check port range if present
		if (url.port) {
			const port = +url.port;
			if (port < 1 || port > 65535) {
				return false;
			}
		}
	} catch {
		return false;
	}
	return true;
};

// Validates and imports a raw P-256 public key.
export const validatePublicKey = async (publicKey: InputBuffer | string, load: (key: DataView) => Promise<void>): Promise<DataView> => {
	try {
		const key = typeof publicKey === 'string' ? toDataView(fromB64(publicKey), 'Public key') : toDataView(publicKey, 'Public key');
		if (key.byteLength !== 65) {
			throw new Error();
		}
		await load(key);
		return key;
	} catch (_err) {
		throw new Error('Invalid public key');
	}
};

// Validates and imports a raw P-256 private key.
export const validatePrivateKey = async (
	privateKey: InputBuffer | string,
	label: string,
	load: (key: DataView) => Promise<void>
): Promise<void> => {
	try {
		const key = typeof privateKey === 'string' ? toDataView(fromB64(privateKey), label) : toDataView(privateKey, label);
		await load(key);
	} catch (_err) {
		throw new Error(`Invalid ${label.toLowerCase()}`);
	}
};

// Validates a device user name used by user management commands.
export const validateUserName = (name: string): string => {
	if (typeof name !== 'string' || name.length < 1 || name.length > 255) {
		throw new Error('Invalid user name');
	}
	return name;
};

// Validates user creation flags supported by this client.
export const validateUserCreationFlags = (flags: number, allowedFlags: number): number => {
	if (!Number.isInteger(flags) || flags < 0 || flags > 0xff || (flags & ~allowedFlags) !== 0) {
		throw new Error('Invalid user creation flags');
	}
	return flags;
};
