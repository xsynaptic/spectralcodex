import { useCallback, useSyncExternalStore } from 'react';

// eslint-disable-next-line unicorn/consistent-boolean-name -- named for its useSyncExternalStore slot, not for what it returns
function getServerSnapshot() {
	return false;
}

function buildMediaQuery(above?: string, below?: string, query?: string): string {
	if (above) return `(min-width: ${above})`;
	if (below) return `(max-width: ${below})`;
	return query ?? '';
}

// eslint-disable-next-line unicorn/consistent-boolean-name -- the conventional name for this hook; call sites bind the result to an `is` variable
export function useMediaQuery({
	query,
	above,
	below,
}: {
	above?: string;
	below?: string;
	query?: string;
}): boolean {
	const mediaQuery = buildMediaQuery(above, below, query);

	const subscribe = useCallback(
		(callback: () => void) => {
			const matchMedia = globalThis.window.matchMedia(mediaQuery);

			matchMedia.addEventListener('change', callback);

			return () => {
				matchMedia.removeEventListener('change', callback);
			};
		},
		[mediaQuery],
	);

	const getSnapshot = useCallback(() => {
		return globalThis.matchMedia(mediaQuery).matches;
	}, [mediaQuery]);

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
