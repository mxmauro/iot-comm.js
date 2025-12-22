import { useEffect, useState } from 'preact/hooks';
import { useClientContext } from '../hooks/client.js';
import { useIsMounted } from '../hooks/mounted.js';
import { b64ToArrayBuffer } from '../utils/b64.js';
import { html } from '../utils/html.js';
import { showToast } from '../utils/toast.js';
import { isValidHostnameAndPort } from '../utils/validation.js';

// -----------------------------------------------------------------------------

export const ConnectPage = () => {
	const isMounted = useIsMounted();
	const { connect } = useClientContext();

	const [connecting, setConnecting] = useState(false);

	const [hostnameAndPort, setHostnameAndPort] = useState('');
	const [username, setUsername] = useState('');
	const [privateKey, setPrivateKey] = useState('');

	const [privateKeyReadOnly, setPrivateKeyReadOnly] = useState(true);

	const [hostnameAndPortError, setHostnameAndPortError] = useState('');
	const [usernameError, setUsernameError] = useState('');
	const [privateKeyError, setPrivateKeyError] = useState('');

	useEffect(() => {
		const saved = localStorage.getItem('IoT-Comm-Demo_ServerHost');
		if (saved) {
			setHostnameAndPort(saved);
		}
	}, []);

	const handleHostnameAndPortInput = (e) => {
		const v = e.target.value;
		setHostnameAndPort(v);
	};
	const handleUsernameInput = (e) => {
		const v = e.target.value;
		setUsername(v);
	};
	const handlePrivateKeyInput = (e) => {
		const v = e.target.value;
		setPrivateKey(v);
	};

	const handleConnectBtn = (e) => {
		let hasError = false;

		e.preventDefault();
		e.stopPropagation();

		if (isValidHostnameAndPort(hostnameAndPort)) {
			setHostnameAndPortError('');
		} else {
			setHostnameAndPortError('Invalid or missing hostname and port.');
			hasError = true;
		}

		if (username.length > 0) {
			setUsernameError('');
		} else {
			setUsernameError('Missing user name.');
			hasError = true;
		}

		let privateKeyBytes;
		try {
			privateKeyBytes = b64ToArrayBuffer(privateKey);
			if (privateKeyBytes.byteLength !== 32) {
				throw new Error();
			}
			setPrivateKeyError('');
		} catch {
			setPrivateKeyError('Missing or invalid private key.');
			hasError = true;
		}

		if (hasError) {
			return;
		}

		// Save host
		localStorage.setItem('IoT-Comm-Demo_ServerHost', hostnameAndPort);

		// Try to connect to backend
		setConnecting(true);
		connect(hostnameAndPort, username, privateKeyBytes).catch((err) => {
			if (isMounted) {
				showToast(err.message, 'error');
				console.error('Connect |', err);
				setConnecting(false);
			}
		});
	};

	const connectLabel = !connecting ? 'Connect' : 'Connecting ';

	return html`
		<div>
			<form novalidate autocomplete="off">
				<fieldset>
					<label>
						Hostname and port:
						<input
							type="text"
							value=${hostnameAndPort}
							onInput=${handleHostnameAndPortInput}
							placeholder="hostname:port"
							disabled=${connecting}
							aria-invalid=${hostnameAndPortError ? 'true' : null}
						/>
						${
							hostnameAndPortError &&
							html`
							<small role="status" className='pico-color-red-500'>${hostnameAndPortError}</small>
						`
						}
					</label>
					<label>
						User name:
						<input
							type="text"
							value=${username}
							onInput=${handleUsernameInput}
							disabled=${connecting}
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
						Private key:
						<input
							type="password"
							value=${privateKey}
							onInput=${handlePrivateKeyInput}
							placeholder="Base64-encoded private key"
							disabled=${connecting}
							autocomplete="off"
							aria-invalid=${privateKeyError ? 'true' : null}
							readonly=${privateKeyReadOnly}
							onfocus=${() => setPrivateKeyReadOnly(false)}
						/>
						${
							privateKeyError &&
							html`
							<small role="status" className='pico-color-red-500'>${privateKeyError}</small>
						`
						}
					</label>
				</fieldset>
				<button type="submit" onClick=${handleConnectBtn} disabled=${connecting}>
					<span class="three-dots-container">
						${connectLabel}
						${
							connecting &&
							html`
							<span class="dots"><span>.</span><span>.</span><span>.</span></span>
						`
						}
					</span>
				</button>
			</form>
		</div>
	`;
};
