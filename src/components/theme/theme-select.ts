/* eslint-disable unicorn/prefer-global-this */
import type { ThemeChangedEvent } from '@/components/theme/theme-manager';

import { isThemeTypeValid } from '@/components/theme/theme-manager';

export function themeSelect(themeSelectElement: HTMLSelectElement | null) {
	if (!themeSelectElement) return;

	function updateSelectedTheme(newTheme = window.theme.getTheme()) {
		if (!themeSelectElement) return;
		themeSelectElement.value = newTheme;
		console.log('update!', newTheme);
	}

	themeSelectElement.addEventListener('change', (event) => {
		const target = event.target;

		if (target && target instanceof HTMLSelectElement && isThemeTypeValid(target.value)) {
			window.theme.setTheme(target.value);
		}
		console.log('change');
	});

	document.addEventListener(
		'theme-changed',
		(event: CustomEventInit<ThemeChangedEvent['detail']>) => {
			if (event.detail) updateSelectedTheme(event.detail.theme);
		},
	);

	updateSelectedTheme();
}
