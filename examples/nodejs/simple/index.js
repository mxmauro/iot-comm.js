import { Client } from '../../../dist/node/index.js';
import { ask, askHidden } from './console.js';

// -----------------------------------------------------------------------------

const getArgValue = (name) => {
	const prefix = `${name}=`;
	for (let i = 0; i < process.argv.length; i++) {
		const arg = process.argv[i];
		if (arg === name) {
			return i < process.argv.length - 1 ? process.argv[i + 1] : '';
		}
		if (arg.startsWith(prefix)) {
			return arg.slice(prefix.length);
		}
	}
	return '';
};

// -----------------------------------------------------------------------------

const main = async () => {
	const hostname = getArgValue('--host') || (await ask('Hostname'));
	if (!hostname) {
		return;
	}
	const username = getArgValue('--username') || (await ask('User name'));
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
		privateKey: privKey
	});

	await client.close();
};

main().catch((err) => {
	console.error(err);
});
