import { useState } from 'preact/hooks';
import { useClientContext } from '../hooks/client.js';
import { useIsMounted } from '../hooks/mounted.js';
import { html } from '../utils/html.js';
import { showToast } from '../utils/toast.js';

// -----------------------------------------------------------------------------

export const DeleteUserPanel = () => {
	const { client } = useClientContext();
	const isMounted = useIsMounted();

	const [waitingReply, setWaitingReply] = useState(false);

	const [username, setUsername] = useState('');
	const [repeatUsername, setRepeatUsername] = useState('');

	const [usernameError, setUsernameError] = useState('');
	const [repeatUsernameError, setRepeatUsernameError] = useState('');

	const handleUsernameInput = (e) => {
		const v = e.target.value;
		setUsername(v);
	};
	const handleRepeatUsernameInput = (e) => {
		const v = e.target.value;
		setRepeatUsername(v);
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

		if (username === repeatUsername) {
			setRepeatUsernameError('');
		} else {
			setRepeatUsernameError('Repeat the user name to confirm.');
			hasError = true;
		}

		if (hasError) {
			return;
		}

		// Send command
		setWaitingReply(true);
		client
			.deleteUserCommand(username)
			.then(() => {
				if (isMounted) {
					showToast('User successfully deleted.', 'success');
					setUsername('');
					setRepeatUsername('');
					setWaitingReply(false);
				}
			})
			.catch((err) => {
				if (isMounted) {
					showToast(err.message, 'error');
					console.error('Delete user |', err);
					setWaitingReply(false);
				}
			});
	};

	const sendLabel = !waitingReply ? 'Send' : 'Waiting reply ';

	return html`
		<article>
			<header>Delete user</header>
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
						Repeat user name:
						<input
							type="text"
							value=${repeatUsername}
							onInput=${handleRepeatUsernameInput}
							disabled=${waitingReply}
							autocomplete="off"
							aria-invalid=${repeatUsernameError ? 'true' : null}
						/>
						${
							repeatUsernameError &&
							html`
							<small role="status" className='pico-color-red-500'>${repeatUsernameError}</small>
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
