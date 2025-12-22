import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';

// -----------------------------------------------------------------------------

export const ask = async (prompt) => {
	const rl = readline.createInterface({ input, output });
	try {
		return await rl.question(`${prompt}: `);
	} finally {
		rl.close();
	}
};

export const askHidden = async (prompt) => {
	const isTTY = input.isTTY;
	const rl = readline.createInterface({
		input,
		output,
		...(isTTY && {
			terminal: false
		})
	});

	output.write(`${prompt}: `);

	try {
		if (isTTY) {
			const password = await new Promise((resolve, reject) => {
				// TTY mode - hide input
				let password = '';
				let muted = false;

				const originalWrite = output.write.bind(output);
				const origInputEncoding = input.encoding;

				output.write = (chunk, encoding, callback) => {
					if (!muted) {
						return originalWrite(chunk, encoding, callback);
					}
					if (typeof chunk === 'string' && chunk.length === 1 && chunk.charCodeAt(0) >= 32) {
						originalWrite('*', encoding, callback);
					}
					return true;
				};

				const onData = (char) => {
					switch (char) {
						case '\n':
						case '\r':
						case '\u0004': // Ctrl-D
							cleanup();
							originalWrite('\n');
							resolve(password);
							break;

						case '\u0003': // Ctrl-C
							cleanup();
							originalWrite('\n');
							reject(new Error('Cancelled'));
							break;

						case '\u007f': // Backspace (Unix)
						case '\b': // Backspace (Windows)
							if (password.length > 0) {
								password = password.slice(0, -1);
								originalWrite('\b \b');
							}
							break;

						default:
							// Ignore control characters
							if (char.charCodeAt(0) >= 32) {
								password += char;
								originalWrite('*');
							}
							break;
					}
				};

				const cleanup = () => {
					muted = false;
					output.write = originalWrite;
					input.setRawMode(false);
					input.setEncoding(origInputEncoding);
					input.pause();
					input.off('data', onData);
				};

				muted = true;
				input.setRawMode(true);
				input.resume();
				input.setEncoding('utf8');
				input.on('data', onData);
			});
			return password;
		} else {
			// Non-TTY mode (piped input, VSCode debug console)
			const password = await new Promise((resolve, reject) => {
				rl.on('line', (line) => {
					resolve(line);
				});

				rl.on('close', () => {
					reject(new Error('Canceled'));
				});
			});
			return password;
		}
	} finally {
		rl.close();
	}
};
