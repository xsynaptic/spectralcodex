import { useEffect, useMemo, useState } from 'react';

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
	const mediaQuery = useMemo(() => {
		if (above) {
			return `(min-width: ${above})`;
		}
		if (below) {
			return `(max-width: ${below})`;
		}
		return query ?? '';
	}, [above, below, query]);

	const [matches, setMatches] = useState<boolean>(false);

	useEffect(
		function handleWindowChange() {
			const handleChange = () => {
				setMatches(globalThis.matchMedia(mediaQuery).matches);
			};

			const matchMedia = globalThis.window.matchMedia(mediaQuery);

			// Triggered at the first client-side load and if query changes
			handleChange();

			matchMedia.addEventListener('change', handleChange);

			return () => {
				matchMedia.removeEventListener('change', handleChange);
			};
		},
		[mediaQuery],
	);

	return matches;
}

/** Unfortunately passing `var(--breakpoint-sm)` is not working here */
export function useMediaQueryMobile(): boolean {
	return useMediaQuery({ below: '40rem' });
}
