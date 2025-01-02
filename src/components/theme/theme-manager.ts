/* eslint-disable unicorn/prefer-global-this */
export const ThemeTypeEnum = {
	Auto: 'auto',
	Dark: 'dark',
	Light: 'light',
} as const;

export type ThemeType = (typeof ThemeTypeEnum)[keyof typeof ThemeTypeEnum];

export type ThemeChangedEvent = CustomEvent<{
	theme: ThemeType;
	systemTheme: Extract<ThemeType, 'light' | 'dark'>;
	defaultTheme: ThemeType;
}>;

export function isThemeTypeValid(theme: string | undefined): theme is ThemeType {
	return (
		(theme !== undefined && theme === ThemeTypeEnum.Auto) ||
		theme === ThemeTypeEnum.Dark ||
		theme === ThemeTypeEnum.Light
	);
}

export function themeManager(defaultThemeRaw: string | undefined) {
	const storageKey = 'theme';
	const store =
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		typeof localStorage === 'undefined' ? { getItem: () => {}, setItem: () => {} } : localStorage;
	const defaultTheme = isThemeTypeValid(defaultThemeRaw) ? defaultThemeRaw : ThemeTypeEnum.Auto;

	const mediaMatcher = window.matchMedia('(prefers-color-scheme: light)');

	let systemTheme = mediaMatcher.matches ? ThemeTypeEnum.Light : ThemeTypeEnum.Dark;

	mediaMatcher.addEventListener('change', (event) => {
		systemTheme = event.matches ? ThemeTypeEnum.Light : ThemeTypeEnum.Dark;
		applyTheme(window.theme.getTheme());
	});

	function applyTheme(theme: ThemeType) {
		const resolvedTheme = theme === ThemeTypeEnum.Auto ? systemTheme : theme;

		document.documentElement.dataset.theme = resolvedTheme;
		document.documentElement.style.colorScheme = resolvedTheme;
		document.dispatchEvent(
			new CustomEvent('theme-changed', {
				detail: { theme, systemTheme, defaultTheme },
			}) satisfies ThemeChangedEvent,
		);
	}

	function setTheme(theme: ThemeType = defaultTheme) {
		store.setItem(storageKey, theme);
		applyTheme(theme);
	}

	function getTheme(): ThemeType {
		const themeStored = store.getItem(storageKey);

		return themeStored && isThemeTypeValid(themeStored) ? themeStored : defaultTheme;
	}

	function getSystemTheme(): Extract<ThemeType, 'light' | 'dark'> {
		return systemTheme;
	}

	function getDefaultTheme() {
		return defaultTheme;
	}

	return { setTheme, getTheme, getSystemTheme, getDefaultTheme };
}
