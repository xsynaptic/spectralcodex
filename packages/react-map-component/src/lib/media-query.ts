import { useCallback, useSyncExternalStore } from 'react';

function getServerSnapshot() {
	return false;
}

function buildMediaQuery(above?: string, below?: string, query?: string): string {
	if (above) return `(min-width: ${above})`;
	if (below) return `(max-width: ${below})`;
	return query ?? '';
}

// A flexible custom hook to handle media queries
// This allows for different operations depending on the width of the viewport
// It can be useful for optimizing UX on mobile
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
