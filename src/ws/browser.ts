import EventEmitter from 'eventemitter3';
import type { ConnectOptions, IWebSocket, WebSocketEvents } from './interface';
import { CLOSE_ABNORMAL, CLOSE_NORMAL, CLOSED, CLOSING, CONNECTING, ConnectCloseError, ConnectTimeoutError, OPEN } from './interface';

// -----------------------------------------------------------------------------

export const createWebSocket = (): IWebSocket => {
	return new BrowserWebSocket();
};

// -----------------------------------------------------------------------------

export class BrowserWebSocket implements IWebSocket {
	private emitter = new EventEmitter<WebSocketEvents>();
	private ws: WebSocket | null = null;

	constructor() {
		this.onWsMessage = this.onWsMessage.bind(this);
		this.onWsClose = this.onWsClose.bind(this);
	}

	public async connect(opts: ConnectOptions): Promise<void> {
		if (this.ws) {
			throw new Error('WebSocket is already connected');
		}

		const url = opts.url.replace(/^http/, 'ws');

		const ws = new WebSocket(url, opts.protocols);
		ws.binaryType = 'arraybuffer';

		await new Promise<void>((resolve, reject) => {
			let settled = false;
			let timeoutId: ReturnType<typeof setTimeout> | undefined;

			const cleanup = () => {
				if (timeoutId !== undefined) {
					clearTimeout(timeoutId);
				}

				ws.removeEventListener('open', onOpenOnce);
				ws.removeEventListener('close', onCloseOnce);
			};

			const onOpenOnce = () => {
				if (!settled) {
					settled = true;
					cleanup();
					this.ws = ws;
					ws.addEventListener('message', this.onWsMessage);
					ws.addEventListener('close', this.onWsClose);
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

			ws.addEventListener('open', onOpenOnce);
			ws.addEventListener('close', onCloseOnce);
			ws.addEventListener('error', (event) => {
				console.error('WebSocket error:', event);
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

	private onWsMessage(event: MessageEvent): void {
		if (typeof event.data === 'string') {
			this.emitter.emit('message', event.data);
		} else if (event.data instanceof ArrayBuffer) {
			this.emitter.emit('message', event.data);
		} else {
			// Blob or other data - convert to string
			this.emitter.emit('message', String(event.data));
		}
	}

	private onWsClose(event: CloseEvent): void {
		this.detachForwarders();
		this.emitter.emit('close', {
			code: event.code,
			reason: event.reason
		});
	}

	private detachForwarders() {
		if (this.ws) {
			this.ws.removeEventListener('message', this.onWsMessage);
			this.ws.removeEventListener('close', this.onWsClose);
		}
	}
}
