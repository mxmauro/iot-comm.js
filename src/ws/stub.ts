import type { IWebSocket } from './interface';

// -----------------------------------------------------------------------------

// Creates the fallback WebSocket transport implementation for unsupported targets.
export const createWebSocket = (): IWebSocket => {
	throw new Error('Not implemented');
};
