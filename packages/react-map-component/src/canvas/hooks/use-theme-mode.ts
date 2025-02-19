/* eslint-disable unicorn/prefer-global-this */
import { useEffect, useState } from 'react';

/**
 * These types mirror the theme system types in the main Astro application.
 * They must be kept in sync with @/components/theme/theme-types
 */
type Theme = 'light' | 'dark' | 'auto';
type ResolvedTheme = Omit<Theme, 'auto'>;

interface ThemeChangedEventDetail {
	theme: Theme;
	resolvedTheme: ResolvedTheme;
}

interface ThemeChangedEvent extends CustomEvent {
	detail: ThemeChangedEventDetail;
}

export function useThemeMode() {
	const [isDarkMode, setDarkMode] = useState(() => {
		if (typeof window === 'undefined') return false;

		const resolvedTheme =
			window.theme?.getTheme() === 'auto'
				? window.theme.getSystemTheme()
				: window.theme?.getTheme();

		return resolvedTheme === 'dark';
	});

	useEffect(() => {
		function handleThemeChange(event: ThemeChangedEvent) {
			setDarkMode(event.detail.resolvedTheme === 'dark');
		}

		document.addEventListener('theme-changed', handleThemeChange as EventListener);

		return () => {
			document.removeEventListener('theme-changed', handleThemeChange as EventListener);
		};
	}, []);

	return isDarkMode;
}
