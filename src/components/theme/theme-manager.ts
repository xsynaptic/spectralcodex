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
		typeof localStorage === 'undefined'
			? {
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					getItem: () => {},
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					setItem: () => {},
				}
			: localStorage;

	const defaultThemeRaw = defaultThemeId
		? document.querySelector<HTMLScriptElement>(defaultThemeId)?.dataset.defaultTheme
		: undefined;
	const defaultTheme = isThemeTypeValid(defaultThemeRaw) ? defaultThemeRaw : ThemeTypeEnum.Auto;

	const mediaMatcher = window.matchMedia(`(prefers-color-scheme: ${ThemeTypeEnum.Light})`);

	let systemTheme: ThemeSystemType = mediaMatcher.matches
		? ThemeTypeEnum.Light
		: ThemeTypeEnum.Dark;

	function getTheme(): ThemeGeneralType {
		const stored = store.getItem(storageKey);

		return stored && isThemeTypeValid(stored) ? stored : defaultTheme;
	}

	function applyTheme(theme: ThemeGeneralType) {
		const resolvedTheme = theme === ThemeTypeEnum.Auto ? systemTheme : theme;

		document.documentElement.dataset.theme = resolvedTheme;
		document.documentElement.style.colorScheme = resolvedTheme;

		// Dispatch event after DOM is updated
		queueMicrotask(() => {
			document.dispatchEvent(
				new CustomEvent('theme-changed', {
					detail: { theme, systemTheme, defaultTheme, resolvedTheme },
				}) satisfies ThemeChangedEvent,
			);
		});
	}

	function setTheme(theme: ThemeGeneralType = defaultTheme) {
		if (!isThemeTypeValid(theme)) return;
		store.setItem(storageKey, theme);
		applyTheme(theme);
	}

	function handleMediaChange(event: MediaQueryListEvent) {
		systemTheme = event.matches ? ThemeTypeEnum.Light : ThemeTypeEnum.Dark;
		applyTheme(getTheme());
	}

	mediaMatcher.addEventListener('change', handleMediaChange);

	function cleanup() {
		mediaMatcher.removeEventListener('change', handleMediaChange);
	}

	return {
		setTheme,
		getTheme,
		getSystemTheme: () => systemTheme,
		getDefaultTheme: () => defaultTheme,
		cleanup,
	};
}
