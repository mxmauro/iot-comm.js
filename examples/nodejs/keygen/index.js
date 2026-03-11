import { Client } from '../../../dist/node/index.js';

// -----------------------------------------------------------------------------

const main = async () => {
	const keypair = await Client.generateECDSAKeyPair();

	const privateKeyB64 = Buffer.from(keypair.privateKey).toString('base64');
	const publicKeyB64 = Buffer.from(keypair.publicKey).toString('base64');

	console.log('Private key:', privateKeyB64);
	console.log('Public key:', publicKeyB64);
};

main().catch((err) => {
	console.error(err);
});
