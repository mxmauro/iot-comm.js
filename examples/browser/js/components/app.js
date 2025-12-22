import { useClientContext } from '../hooks/client.js';
import { html } from '../utils/html.js';

import { ConnectPage } from './connect.js';
import { ConnectedPage } from './connected.js';

// -----------------------------------------------------------------------------

export const App = () => {
	const { isConnected } = useClientContext();

	return html`
		<main class="container">
			<header>
				<h2 style="text-align: center;">IoT-Comm.js Demo</h2>
			</header>
			<div class="grid">
				${
					!isConnected &&
					html`
					<${ConnectPage} />
				`
				}
				${
					isConnected &&
					html`
					<${ConnectedPage} />
				`
				}
			</div>
		</main>
	`;
};
