export type PromiseResolver<T> = {
	resolve: (value: T) => void;
	// biome-ignore lint/suspicious/noExplicitAny: Definition of reject function
	reject: (reason?: any) => void;
};
