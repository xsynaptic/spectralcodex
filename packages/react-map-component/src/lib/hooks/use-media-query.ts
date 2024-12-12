import { tailwindConfig } from '@spectralcodex/tailwind/config';
import { useEffect, useMemo, useState } from 'react';

type ScreenValue = keyof typeof tailwindConfig.theme.screens;

interface MediaQueryArgs {
	above?: ScreenValue;
	below?: ScreenValue;
	query?: string;
}

// A flexible custom hook to handle media queries
// This allows for different operations depending on the width of the viewport
// It can be useful for optimizing UX on mobile
export function useMediaQuery({ query, above, below }: MediaQueryArgs): boolean {
	const mediaQuery = useMemo(() => {
		if (above) {
			return `(min-width: ${tailwindConfig.theme.screens[above]})`;
		}
		if (below) {
			return `(max-width: ${tailwindConfig.theme.screens[below]})`;
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

export function useMediaQueryMobile(): boolean {
	return useMediaQuery({ below: 'sm' });
}
