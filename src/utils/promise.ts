// Stores the resolve and reject callbacks for a deferred promise.
export type PromiseResolver<T> = {
	resolve: (value: T) => void;
	// biome-ignore lint/suspicious/noExplicitAny: Definition of reject function
	reject: (reason?: any) => void;
};
