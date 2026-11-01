import { stringToNulTerminatedBuffer } from './utils/buffer';
import { validateUserName } from './utils/validation';

// -----------------------------------------------------------------------------

export const encodeUserName = (name: string): Buffer => stringToNulTerminatedBuffer(validateUserName(name));

export const encodeHostname = (hostname: string): Buffer => {
	if (typeof hostname !== 'string' || hostname.length < 1 || hostname.length > 64) {
		throw new Error('Invalid hostname');
	}
	return stringToNulTerminatedBuffer(hostname);
};
