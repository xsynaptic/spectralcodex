import { funnel } from 'remeda';

import { ThemeTypeEnum } from '@/components/theme/theme-types';

export function activateThemeToggle(toggleElementId: string) {
	const toggleElement = document.querySelector<HTMLButtonElement>(toggleElementId);

	if (!toggleElement) return;

	// Debounce toggle that prevents rapid flicking between modes
	const debouncedThemeToggle = funnel(
		() => {
			if (!window.theme) return;

			const currentTheme = window.theme.getTheme();

			switch (currentTheme) {
				case ThemeTypeEnum.Auto:
				case ThemeTypeEnum.Light: {
					window.theme.setTheme(ThemeTypeEnum.Dark);
					break;
				}
				case ThemeTypeEnum.Dark: {
					window.theme.setTheme(ThemeTypeEnum.Light);
					break;
				}
				default: {
					currentTheme satisfies never;
					break;
				}
			}
		},
		{ triggerAt: 'start', minQuietPeriodMs: 500 },
	);

	toggleElement.addEventListener('click', () => {
		debouncedThemeToggle.call();
	});
}
