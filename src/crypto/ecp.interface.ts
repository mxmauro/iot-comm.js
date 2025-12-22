import type { InputBuffer } from '../utils/buffer';

// -----------------------------------------------------------------------------

export interface IBaseECPCrypto {
	generateKeys(): Promise<void>;

	loadRawPublicKey(pubKey: InputBuffer): Promise<void>;
	loadRawPrivateKey(privKey: InputBuffer): Promise<void>;

	saveRawPublicKey(): Promise<ArrayBuffer>;
	saveRawPrivateKey(): Promise<ArrayBuffer>;
}

export interface IECDSACrypto extends IBaseECPCrypto {
	sign(data: InputBuffer | InputBuffer[]): Promise<ArrayBuffer>;
	verify(data: InputBuffer | InputBuffer[], signature: InputBuffer): Promise<boolean>;
}

export interface IECDHCrypto extends IBaseECPCrypto {
	computeSharedSecret(): Promise<ArrayBuffer>;
}
