import EventEmitter from 'eventemitter3';
import WebSocket from 'ws';
import type { ConnectOptions, IWebSocket, WebSocketEvents } from './interface';
import { CLOSE_ABNORMAL, CLOSE_NORMAL, CLOSED, CLOSING, CONNECTING, ConnectCloseError, ConnectTimeoutError, OPEN } from './interface';

// -----------------------------------------------------------------------------

type SocketError = {
	rawPacket?: Buffer;
};

// -----------------------------------------------------------------------------

export const createWebSocket = (): IWebSocket => {
	return new NodeWebSocket();
};

export class NodeWebSocket implements IWebSocket {
	private emitter = new EventEmitter<WebSocketEvents>();
	private ws: WebSocket | null = null;

	constructor() {
		this.onWsMessage = this.onWsMessage.bind(this);
		this.onWsClose = this.onWsClose.bind(this);
	}

	// Connect and wait until the socket either opens or closes/errors.
	// Returns the outcome so callers can branch on it.
	public async connect(opts: ConnectOptions): Promise<void> {
		if (this.ws) {
			throw new Error('WebSocket is already connected');
		}

		const wsOpts: WebSocket.ClientOptions = {
			followRedirects: true
		};
		if (opts.protocols) {
			wsOpts.protocol = Array.isArray(opts.protocols) ? opts.protocols.join(', ') : opts.protocols;
		}

		const ws = new WebSocket(opts.url, wsOpts);
		ws.binaryType = 'arraybuffer';

		return new Promise<void>((resolve, reject) => {
			let settled = false;
			let timeoutId: ReturnType<typeof setTimeout> | undefined;

			const cleanup = () => {
				if (timeoutId !== undefined) {
					clearTimeout(timeoutId);
				}

				ws.off('open', onOpenOnce);
				ws.off('close', onCloseOnce);
			};

			const onOpenOnce = () => {
				if (!settled) {
					settled = true;
					cleanup();
					this.ws = ws;
					ws.on('message', this.onWsMessage);
					ws.on('close', this.onWsClose);
					resolve();
				}
			};

			const onCloseOnce = (event: CloseEvent) => {
				if (!settled) {
					settled = true;
					cleanup();
					reject(new ConnectCloseError(event.code, event.reason));
				}
			};

			if (opts.timeoutMs && opts.timeoutMs > 0) {
				const timeout = opts.timeoutMs;
				timeoutId = setTimeout(() => {
					if (!settled) {
						settled = true;
						try {
							ws.close(CLOSE_ABNORMAL, 'connect-timeout');
						} catch {}
						cleanup();
						reject(new ConnectTimeoutError(timeout));
					}
				}, timeout);
			}

			ws.once('open', onOpenOnce);
			ws.once('close', onCloseOnce);

			ws.on('error', (err: Error & SocketError) => {
				if (typeof err.message === 'string') {
					const idx = err.message.indexOf('Unexpected server response:');
					if (idx >= 0) {
						const status = +err.message.substring(idx + 27).trim();
						if (status >= 400 && status <= 599) {
							if (!settled) {
								settled = true;
								cleanup();
								reject(new ConnectCloseError(0, `Status code: ${status}`));
								return;
							}
						}
					}
				}
				console.error(`WebSocket error: ${err}`);
				if (Buffer.isBuffer(err.rawPacket)) {
					console.error(err.rawPacket.toString('ascii'));
				}
			});
		});
	}

	public send(data: string | ArrayBuffer | ArrayBufferView | Uint8Array): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error('WebSocket is not open');
		}
		this.ws.send(data);
	}

	public close(code?: number, reason?: string): void {
		this.ws?.close(code ?? CLOSE_NORMAL, reason);
	}

	public get readyState(): number {
		if (this.ws) {
			switch (this.ws.readyState) {
				case WebSocket.CONNECTING:
					return CONNECTING;
				case WebSocket.OPEN:
					return OPEN;
				case WebSocket.CLOSING:
					return CLOSING;
			}
		}
		return CLOSED;
	}

	public on<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): this {
		this.emitter.on(event, handler as EventEmitter.EventListener<WebSocketEvents, K>);
		return this;
	}

	public off<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): this {
		this.emitter.off(event, handler as EventEmitter.EventListener<WebSocketEvents, K>);
		return this;
	}

	public once<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): this {
		this.emitter.once(event, handler as EventEmitter.EventListener<WebSocketEvents, K>);
		return this;
	}

	private onWsMessage(data: WebSocket.Data): void {
		if (typeof data === 'string') {
			this.emitter.emit('message', data);
		} else if (data instanceof Buffer) {
			// convert Buffer -> ArrayBuffer
			this.emitter.emit('message', bufferToArrayBuffer(data));
		} else if (data instanceof ArrayBuffer) {
			this.emitter.emit('message', data);
		} else {
			// Buffer[] or other typed data - try to coerce to ArrayBuffer
			try {
				const buf = Buffer.concat(data as Buffer[]);
				this.emitter.emit('message', bufferToArrayBuffer(buf));
			} catch {
				// fallback: stringify
				this.emitter.emit('message', String(data));
			}
		}
	}

	private onWsClose(event: WebSocket.CloseEvent): void {
		this.detachForwarders();
		this.emitter.emit('close', {
			code: event.code ?? 0,
			reason: event.reason ? event.reason.toString() : ''
		});
	}

	private detachForwarders() {
		if (this.ws) {
			this.ws.off('message', this.onWsMessage);
			this.ws.off('close', this.onWsClose);
		}
	}
}

// -----------------------------------------------------------------------------

const bufferToArrayBuffer = (buf: Buffer): ArrayBuffer => {
	const ab = new ArrayBuffer(buf.length);
	new Uint8Array(ab).set(buf);
	return ab;
};
