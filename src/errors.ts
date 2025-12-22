import type { CloseEvent } from './ws/interface';

// -----------------------------------------------------------------------------

export class ClientClosedError extends Error {
	public readonly code: number;
	public readonly reason: string;

	constructor(event: CloseEvent) {
		let reason = event.reason;
		if (!reason) {
			reason = 'unknown';
		}
		super(`Connection closed with code: ${event.code}. Reason: ${reason}`);
		this.name = 'ClientClosedError';
		this.code = event.code;
		this.reason = reason;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ClientClosedError);
		}
	}

	toString(): string {
		return `${this.name}: ${this.message} / Code: ${this.code} / Reason: ${this.reason}`;
	}
}

export class CommandError extends Error {
	public readonly code: number;

	constructor(code: number, message: string) {
		super(message);
		this.name = 'CommandError';
		this.code = code;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ClientClosedError);
		}
	}

	toString(): string {
		return `${this.name}: ${this.message} / Code: ${this.code}`;
	}
}
