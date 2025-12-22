import { createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';
import { html } from '../utils/html.js';

// -----------------------------------------------------------------------------

const GlobalsCtx = createContext(null);

// -----------------------------------------------------------------------------

export const GlobalsCtxProvider = (props) => {
	const [client, setClient] = useState(true);

	const initCtx = { client, setClient };

	return html`
		<${GlobalsCtx.Provider} value=${initCtx}>
			${props.children}
		</${GlobalsCtx.Provider}>
	`;
};

export const useGlobalsCtx = () => {
	return useContext(GlobalsCtx);
};
