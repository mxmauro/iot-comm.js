import { useState } from 'preact/hooks';
import { useClientContext } from '../hooks/client.js';
import { useIsMounted } from '../hooks/mounted.js';
import { b64ToArrayBuffer } from '../utils/b64.js';
import { html } from '../utils/html.js';
import { showToast } from '../utils/toast.js';

// -----------------------------------------------------------------------------

export const CreateUserPanel = () => {
	const { client } = useClientContext();
	const isMounted = useIsMounted();

	const [waitingReply, setWaitingReply] = useState(false);

	const [username, setUsername] = useState('');
	const [publicKey, setPublicKey] = useState('');
	const [repeatPublicKey, setRepeatPublicKey] = useState('');

	const [publicKeyReadOnly, setPublicKeyReadOnly] = useState(true);
	const [repeatPublicKeyReadOnly, setRepeatPublicKeyReadOnly] = useState(true);

	const [usernameError, setUsernameError] = useState('');
	const [publicKeyError, setPublicKeyError] = useState('');
	const [repeatPublicKeyError, setRepeatPublicKeyError] = useState('');

	const handleUsernameInput = (e) => {
		const v = e.target.value;
		setUsername(v);
	};
	const handlePublicKeyInput = (e) => {
		const v = e.target.value;
		setPublicKey(v);
	};
	const handleRepeatPublicKeyInput = (e) => {
		const v = e.target.value;
		setRepeatPublicKey(v);
	};

	const handleSendBtn = (e) => {
		let hasError = false;

		e.preventDefault();
		e.stopPropagation();

		if (username.length > 0) {
			setUsernameError('');
		} else {
			setUsernameError('Missing user name.');
			hasError = true;
		}

		let publicKeyBytes;
		try {
			publicKeyBytes = b64ToArrayBuffer(publicKey);
			if (publicKeyBytes.byteLength !== 65) {
				throw new Error();
			}
			setPublicKeyError('');
		} catch {
			setPublicKeyError('Missing or invalid public key.');
			hasError = true;
		}

		if (publicKey === repeatPublicKey) {
			setRepeatPublicKeyError('');
		} else {
			setRepeatPublicKeyError('Repeat the public key to confirm.');
			hasError = true;
		}

		if (hasError) {
			return;
		}

		// Send command
		setWaitingReply(true);
		client
			.createUserCommand(username, publicKeyBytes)
			.then(() => {
				if (isMounted) {
					showToast('User successfully created.', 'success');
					setUsername('');
					setPublicKey('');
					setRepeatPublicKey('');
					setWaitingReply(false);
				}
			})
			.catch((err) => {
				if (isMounted) {
					showToast(err.message, 'error');
					console.error('Create user |', err);
					setWaitingReply(false);
				}
			});
	};

	const sendLabel = !waitingReply ? 'Send' : 'Waiting for reply ';

	return html`
		<article>
			<header>Create user</header>
			<form novalidate autocomplete="off">
				<fieldset>
					<label>
						User name:
						<input
							type="text"
							value=${username}
							onInput=${handleUsernameInput}
							disabled=${waitingReply}
							autocomplete="off"
							aria-invalid=${usernameError ? 'true' : null}
						/>
						${
							usernameError &&
							html`
							<small role="status" className='pico-color-red-500'>${usernameError}</small>
						`
						}
					</label>
					<label>
						Public key:
						<input
							type="password"
							value=${publicKey}
							onInput=${handlePublicKeyInput}
							placeholder="Base64-encoded public key"
							disabled=${waitingReply}
							autocomplete="off"
							aria-invalid=${publicKeyError ? 'true' : null}
							readonly=${publicKeyReadOnly}
							onfocus=${() => setPublicKeyReadOnly(false)}
						/>
						${
							publicKeyError &&
							html`
							<small role="status" className='pico-color-red-500'>${publicKeyError}</small>
						`
						}
					</label>
					<label>
						Repeat public key:
						<input
							type="password"
							value=${repeatPublicKey}
							onInput=${handleRepeatPublicKeyInput}
							placeholder="Repeat base64-encoded public key"
							disabled=${waitingReply}
							autocomplete="off"
							aria-invalid=${repeatPublicKeyError ? 'true' : null}
							readonly=${repeatPublicKeyReadOnly}
							onfocus=${() => setRepeatPublicKeyReadOnly(false)}
						/>
						${
							repeatPublicKeyError &&
							html`
							<small role="status" className='pico-color-red-500'>${repeatPublicKeyError}</small>
						`
						}
					</label>
				</fieldset>
				<div class="grid">
					<div />
					<div />
					<button type="submit" onClick=${handleSendBtn} disabled=${waitingReply}>
						<span class="three-dots-container">
							${sendLabel}
							${
								waitingReply &&
								html`
								<span class="dots"><span>.</span><span>.</span><span>.</span></span>
							`
							}
						</span>
					</button>
				</div>
			</form>
		</article>
	`;
};
