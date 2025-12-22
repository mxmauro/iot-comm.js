import type { IECDHCrypto, IECDSACrypto } from './ecp.interface';

// -----------------------------------------------------------------------------

export const createECDSACrypto = (): IECDSACrypto => {
	throw new Error('Not implemented');
};

export const createECDHCrypto = (): IECDHCrypto => {
	throw new Error('Not implemented');
};
