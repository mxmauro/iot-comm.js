export const CONNECTING = 0;
export const OPEN = 1;
export const CLOSING = 2;
export const CLOSED = 3;

export const CLOSE_NORMAL = 1000; // Normal closure; connection completed successfully
export const CLOSE_GOING_AWAY = 1001; // Endpoint is going away (server shutdown or browser nav)
export const CLOSE_PROTOCOL_ERROR = 1002; // Protocol error (e.g., invalid frame)
export const CLOSE_UNSUPPORTED_DATA = 1003; // Unsupported data type
export const CLOSE_NO_STATUS = 1005; // No status code present (MUST NOT be set in a close frame)
export const CLOSE_ABNORMAL = 1006; // Abnormal closure (MUST NOT be set in a close frame)
export const CLOSE_INVALID_PAYLOAD = 1007; // Invalid payload data (e.g., bad UTF-8)
export const CLOSE_POLICY_VIOLATION = 1008; // Policy violation (generic)
export const CLOSE_MESSAGE_TOO_BIG = 1009; // Message too big to process
export const CLOSE_MANDATORY_EXT = 1010; // Missing required extension
export const CLOSE_INTERNAL_ERROR = 1011; // Internal server error
export const CLOSE_TLS_HANDSHAKE_FAIL = 1015; // TLS handshake failure (MUST NOT be set in a close frame)

export interface IWebSocket {
	get readyState(): number;

	connect(opts: ConnectOptions): Promise<void>;
	send(data: string | ArrayBuffer | ArrayBufferView | Uint8Array): void;
	close(code?: number, reason?: string): void;

	on<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): this;
	off<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): this;
	once<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): this;
}

export interface ConnectOptions {
	url: string;
	protocols?: string | string[];
	timeoutMs?: number;
}

export type WebSocketEvents = {
	message: (data: string | ArrayBuffer) => void;
	close: (event: CloseEvent) => void;
	error: (error: Error) => void;
};

export type CloseEvent = {
	code: number;
	reason: string;
};

export class ConnectTimeoutError extends Error {
	public readonly timeoutMs: number;

	constructor(timeoutMs: number) {
		super(`WebSocket connect timeout after ${timeoutMs} ms`);
		this.name = 'WSConnectTimeoutError';
		this.timeoutMs = timeoutMs;
	}
}

export class ConnectCloseError extends Error {
	public readonly code: number;
	public readonly reason: string;

	constructor(code: number, reason: string) {
		super(`WebSocket closed during connect (code=${code}, reason='${reason}')`);
		this.name = 'WSConnectCloseError';
		this.code = code;
		this.reason = reason;
	}
}
