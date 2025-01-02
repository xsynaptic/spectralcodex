/* eslint-disable unicorn/prefer-global-this */
import type {
	ThemeChangedEvent,
	ThemeGeneralType,
	ThemeSystemType,
} from '@/components/theme/theme-types';

import { isThemeTypeValid, ThemeTypeEnum } from '@/components/theme/theme-types';

/**
 * Adapted from Astro Tips!
 * @link - https://astro-tips.dev/recipes/dark-mode/
 */
export function themeManager(defaultThemeId: string | undefined) {
	const storageKey = 'theme';
	const store =
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		typeof localStorage === 'undefined' ? { getItem: () => {}, setItem: () => {} } : localStorage;

	const defaultThemeRaw = defaultThemeId
		? document.querySelector<HTMLScriptElement>(defaultThemeId)?.dataset.defaultTheme
		: undefined;
	const defaultTheme = isThemeTypeValid(defaultThemeRaw) ? defaultThemeRaw : ThemeTypeEnum.Auto;

	const mediaMatcher = window.matchMedia(`(prefers-color-scheme: ${ThemeTypeEnum.Light})`);

	let systemTheme = mediaMatcher.matches ? ThemeTypeEnum.Light : ThemeTypeEnum.Dark;

	mediaMatcher.addEventListener('change', (event) => {
		systemTheme = event.matches ? ThemeTypeEnum.Light : ThemeTypeEnum.Dark;
		applyTheme(window.theme.getTheme());
	});

	function applyTheme(theme: ThemeGeneralType) {
		const resolvedTheme = theme === ThemeTypeEnum.Auto ? systemTheme : theme;

		document.documentElement.dataset.theme = resolvedTheme;
		document.documentElement.style.colorScheme = resolvedTheme;
		document.dispatchEvent(
			new CustomEvent('theme-changed', {
				detail: { theme, systemTheme, defaultTheme, resolvedTheme },
			}) satisfies ThemeChangedEvent,
		);
	}

	function setTheme(theme: ThemeGeneralType = defaultTheme) {
		store.setItem(storageKey, theme);
		applyTheme(theme);
	}

	function getTheme(): ThemeGeneralType {
		const themeStored = store.getItem(storageKey);

		return themeStored && isThemeTypeValid(themeStored) ? themeStored : defaultTheme;
	}

	function getSystemTheme(): ThemeSystemType {
		return systemTheme;
	}

	function getDefaultTheme() {
		return defaultTheme;
	}

	return { setTheme, getTheme, getSystemTheme, getDefaultTheme };
}
