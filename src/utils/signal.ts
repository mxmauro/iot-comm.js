// Throws an error when the provided abort signal has already been aborted.
export const throwIfAborted = (signal?: AbortSignal): void => {
	if (!signal?.aborted) {
		return;
	}

	if (signal.reason instanceof Error) {
		throw signal.reason;
	}
	if (typeof signal.reason === 'string' && signal.reason.length > 0) {
		throw new Error(signal.reason);
	}
	throw new Error('Operation aborted');
};
