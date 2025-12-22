import { createECDSACrypto } from '@/crypto/ecp';

// -----------------------------------------------------------------------------

export type KeyPair = {
	publicKey: ArrayBuffer;
	privateKey: ArrayBuffer;
};

// -----------------------------------------------------------------------------

export const generateKeyPair = async (): Promise<KeyPair> => {
	const ecdsa = createECDSACrypto();
	await ecdsa.generateKeys();

	const publicKey = await ecdsa.saveRawPublicKey();
	const privateKey = await ecdsa.saveRawPrivateKey();

	return { publicKey, privateKey };
};
