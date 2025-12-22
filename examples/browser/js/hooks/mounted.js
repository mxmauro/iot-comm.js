import { useEffect, useRef } from 'preact/hooks';

// -----------------------------------------------------------------------------

export const useIsMounted = () => {
	const isMountedRef = useRef(true);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	return isMountedRef;
};
