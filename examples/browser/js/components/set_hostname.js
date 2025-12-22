import { useState } from 'preact/hooks';
import { useClientContext } from '../hooks/client.js';
import { useIsMounted } from '../hooks/mounted.js';
import { html } from '../utils/html.js';
import { showToast } from '../utils/toast.js';
import { isValidHostname } from '../utils/validation.js';

// -----------------------------------------------------------------------------

export const SetHostnamePanel = () => {
	const { client } = useClientContext();
	const isMounted = useIsMounted();

	const [waitingReply, setWaitingReply] = useState(false);

	const [hostname, setHostname] = useState('');

	const [hostnameError, setHostnameError] = useState('');

	const handleHostnameInput = (e) => {
		const v = e.target.value;
		setHostname(v);
	};

	const handleSendBtn = (e) => {
		let hasError = false;

		e.preventDefault();
		e.stopPropagation();

		if (isValidHostname(hostname)) {
			setHostnameError('');
		} else {
			setHostnameError('Invalid or missing hostname and port.');
			hasError = true;
		}

		if (hasError) {
			return;
		}

		// Send command
		setWaitingReply(true);
		client
			.setHostnameCommand(hostname)
			.then(() => {
				if (isMounted) {
					showToast('Hostname successfully set.', 'success');
					setHostname('');
					setWaitingReply(false);
				}
			})
			.catch((err) => {
				if (isMounted) {
					showToast(err.message, 'error');
					console.error('Set hostname |', err);
					setWaitingReply(false);
				}
			});
	};

	const sendLabel = !waitingReply ? 'Send' : 'Waiting reply ';

	return html`
		<article>
			<header>Set hostname</header>
			<form novalidate autocomplete="off">
				<fieldset>
					<label>
						Hostname:
						<input
							type="text"
							value=${hostname}
							onInput=${handleHostnameInput}
							placeholder="host name"
							disabled=${waitingReply}
							autocomplete="off"
							aria-invalid=${hostnameError ? 'true' : null}
						/>
						${
							hostnameError &&
							html`
							<small role="status" className='pico-color-red-500'>${hostnameError}</small>
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
