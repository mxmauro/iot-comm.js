import { useState } from 'preact/hooks';
import { useClientContext } from '../hooks/client.js';
import { html } from '../utils/html.js';
import { ChangeUserCredentialsPanel } from './change_user_creds.js';
import { CreateUserPanel } from './create_user.js';
import { DeleteUserPanel } from './delete_user.js';
import { ResetUserCredentialsPanel } from './reset_user_creds.js';
import { SetHostnamePanel } from './set_hostname.js';

// -----------------------------------------------------------------------------

export const ConnectedPage = () => {
	const [activePanel, setActivePanel] = useState(0);
	const [closing, setClosing] = useState(false);
	const { client } = useClientContext();

	const handleActivatePanelBtn = (e, panelIndex) => {
		e.preventDefault();
		e.stopPropagation();

		if (panelIndex >= 0 && panelIndex <= 4) {
			setActivePanel(panelIndex);
		}
	};

	const handleDisconnectBtn = (e) => {
		e.preventDefault();
		e.stopPropagation();

		setClosing(true);

		client.close().catch();
	};

	if (closing) {
		return html`<div>Closing...</div>`;
	}

	return html`
		<div>
			<div role="group">
				<button aria-current=${activePanel === 0 ? 'true' : null} onClick=${(e) => handleActivatePanelBtn(e, 0)}>Create user</button>
				<button aria-current=${activePanel === 1 ? 'true' : null} onClick=${(e) => handleActivatePanelBtn(e, 1)}>Delete user</button>
				<button aria-current=${activePanel === 2 ? 'true' : null} onClick=${(e) => handleActivatePanelBtn(e, 2)}>Change credentials</button>
				<button aria-current=${activePanel === 3 ? 'true' : null} onClick=${(e) => handleActivatePanelBtn(e, 3)}>Reset credentials</button>
				<button aria-current=${activePanel === 4 ? 'true' : null} onClick=${(e) => handleActivatePanelBtn(e, 4)}>Set hostname</button>
				<button class="contrast" onClick=${handleDisconnectBtn}>Disconnect</button>
			</div>
			${
				activePanel === 0 &&
				html`
				<${CreateUserPanel} />
			`
			}
			${
				activePanel === 1 &&
				html`
				<${DeleteUserPanel} />
			`
			}
			${
				activePanel === 2 &&
				html`
				<${ChangeUserCredentialsPanel} />
			`
			}
			${
				activePanel === 3 &&
				html`
				<${ResetUserCredentialsPanel} />
			`
			}
			${
				activePanel === 4 &&
				html`
				<${SetHostnamePanel} />
			`
			}
		</div>
	`;
};
