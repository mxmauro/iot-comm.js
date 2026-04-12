// Generates random bytes using the fallback unsupported-target implementation.
export const randomize = (_len: number): ArrayBuffer => {
	throw new Error('Not implemented');
};
