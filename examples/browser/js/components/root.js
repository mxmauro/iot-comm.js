import { ClientContextProvider } from '../hooks/client.js';
import { html } from '../utils/html.js';
import { App } from './app.js';

// -----------------------------------------------------------------------------

export const Root = () => {
	return html`
		<${ClientContextProvider}>
			<${App} />
		</${ClientContextProvider}>
	`;
};
