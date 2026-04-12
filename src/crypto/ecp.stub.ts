import type { IECDHCrypto, IECDSACrypto } from './ecp.interface';

// -----------------------------------------------------------------------------

// Creates the fallback ECDSA crypto implementation for unsupported targets.
export const createECDSACrypto = (): IECDSACrypto => {
	throw new Error('Not implemented');
};

// Creates the fallback ECDH crypto implementation for unsupported targets.
export const createECDHCrypto = (): IECDHCrypto => {
	throw new Error('Not implemented');
};
