import { useState } from 'preact/hooks';
import { useClientContext } from '../hooks/client.js';
import { useIsMounted } from '../hooks/mounted.js';
import { b64ToArrayBuffer } from '../utils/b64.js';
import { html } from '../utils/html.js';
import { showToast } from '../utils/toast.js';

// -----------------------------------------------------------------------------

export const ResetUserCredentialsPanel = () => {
	const { client } = useClientContext();
	const isMounted = useIsMounted();

	const [waitingReply, setWaitingReply] = useState(false);

	const [username, setUsername] = useState('');
	const [newPublicKey, setNewPublicKey] = useState('');
	const [repeatNewPublicKey, setRepeatNewPublicKey] = useState('');

	const [newPublicKeyReadOnly, setNewPublicKeyReadOnly] = useState(true);
	const [repeatNewPublicKeyReadOnly, setRepeatNewPublicKeyReadOnly] = useState(true);

	const [usernameError, setUsernameError] = useState('');
	const [newPublicKeyError, setNewPublicKeyError] = useState('');
	const [repeatNewPublicKeyError, setRepeatNewPublicKeyError] = useState('');

	const handleUsernameInput = (e) => {
		const v = e.target.value;
		setUsername(v);
	};
	const handleNewPublicKeyInput = (e) => {
		const v = e.target.value;
		setNewPublicKey(v);
	};
	const handleRepeatNewPublicKeyInput = (e) => {
		const v = e.target.value;
		setRepeatNewPublicKey(v);
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

		let newPublicKeyBytes;
		try {
			newPublicKeyBytes = b64ToArrayBuffer(newPublicKey);
			if (newPublicKeyBytes.byteLength !== 65) {
				throw new Error();
			}
			setNewPublicKeyError('');
		} catch {
			setNewPublicKeyError('Missing or invalid new public key.');
			hasError = true;
		}

		if (newPublicKey === repeatNewPublicKey) {
			setRepeatNewPublicKeyError('');
		} else {
			setRepeatNewPublicKeyError('Repeat the new public key to confirm.');
			hasError = true;
		}

		if (hasError) {
			return;
		}

		// Send command
		setWaitingReply(true);
		client
			.resetUserCredentialsCommand(username, newPublicKeyBytes)
			.then(() => {
				if (isMounted) {
					showToast('User credentials successfully reset.', 'success');
					setNewPublicKey('');
					setRepeatNewPublicKey('');
					setWaitingReply(false);
				}
			})
			.catch((err) => {
				if (isMounted) {
					showToast(err.message, 'error');
					console.error('Reset user credentials |', err);
					setWaitingReply(false);
				}
			});
	};

	const sendLabel = !waitingReply ? 'Send' : 'Waiting reply ';

	return html`
		<article>
			<header>Reset user credentials</header>
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
							value=${newPublicKey}
							onInput=${handleNewPublicKeyInput}
							placeholder="Base64-encoded new public key"
							disabled=${waitingReply}
							autocomplete="off"
							aria-invalid=${newPublicKeyError ? 'true' : null}
							readonly=${newPublicKeyReadOnly}
							onfocus=${() => setNewPublicKeyReadOnly(false)}
						/>
						${
							newPublicKeyError &&
							html`
							<small role="status" className='pico-color-red-500'>${newPublicKeyError}</small>
						`
						}
					</label>
					<label>
						Repeat public key:
						<input
							type="password"
							value=${repeatNewPublicKey}
							onInput=${handleRepeatNewPublicKeyInput}
							placeholder="Repeat base64-encoded new public key"
							disabled=${waitingReply}
							autocomplete="off"
							aria-invalid=${repeatNewPublicKeyError ? 'true' : null}
							readonly=${repeatNewPublicKeyReadOnly}
							onfocus=${() => setRepeatNewPublicKeyReadOnly(false)}
						/>
						${
							repeatNewPublicKeyError &&
							html`
							<small role="status" className='pico-color-red-500'>${repeatNewPublicKeyError}</small>
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
