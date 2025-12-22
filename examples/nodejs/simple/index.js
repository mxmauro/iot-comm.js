import { Client } from '../../../dist/node/index.js';
import { ask, askHidden } from './console.js';

// -----------------------------------------------------------------------------

const main = async () => {
	const hostname = await ask('Hostname');
	if (!hostname) {
		return;
	}
	const username = await ask('User name');
	if (!username) {
		return;
	}
	const privKey = await askHidden('Private key');
	if (!privKey) {
		return;
	}

	const client = new Client();

	await client.connect({
		hostname,
		username,
		privKey
	});

	await client.close();
};

main().catch((err) => {
	console.error(err);
});
