export const ThemeTypeEnum = {
	Auto: 'auto',
	Dark: 'dark',
	Light: 'light',
} as const;

export type ThemeGeneralType = (typeof ThemeTypeEnum)[keyof typeof ThemeTypeEnum];

export type ThemeSystemType = Extract<ThemeGeneralType, 'light' | 'dark'>;

export type ThemeChangedEvent = CustomEvent<{
	theme: ThemeGeneralType;
	defaultTheme: ThemeGeneralType;
	systemTheme: ThemeSystemType;
	resolvedTheme: ThemeSystemType;
}>;

export function isThemeTypeValid(theme: string | undefined): theme is ThemeGeneralType {
	return (
		(theme !== undefined && theme === ThemeTypeEnum.Auto) ||
		theme === ThemeTypeEnum.Dark ||
		theme === ThemeTypeEnum.Light
	);
}
