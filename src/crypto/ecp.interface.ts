import type { InputBuffer } from '../utils/buffer';

// -----------------------------------------------------------------------------

// Defines the shared elliptic-curve key import and export operations.
export interface IBaseECPCrypto {
	generateKeys(): Promise<void>;

	loadRawPublicKey(pubKey: InputBuffer): Promise<void>;
	loadRawPrivateKey(privKey: InputBuffer): Promise<void>;

	saveRawPublicKey(): Promise<ArrayBuffer>;
	saveRawPrivateKey(): Promise<ArrayBuffer>;
}

// Defines the ECDSA signing and verification operations used by the client.
export interface IECDSACrypto extends IBaseECPCrypto {
	sign(data: InputBuffer | InputBuffer[]): Promise<ArrayBuffer>;
	verify(data: InputBuffer | InputBuffer[], signature: InputBuffer): Promise<boolean>;
}

// Defines the ECDH shared-secret operations used during session setup.
export interface IECDHCrypto extends IBaseECPCrypto {
	computeSharedSecret(): Promise<ArrayBuffer>;
}
