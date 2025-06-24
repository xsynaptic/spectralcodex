import { funnel } from 'remeda';

import { ModeTypeEnum } from '#components/mode/mode-types.ts';

export function activateModeToggle(toggleElementId: string) {
	const toggleElement = document.querySelector<HTMLButtonElement>(toggleElementId);

	if (!toggleElement) return;

	// Debounce toggle that prevents rapid flicking between modes
	const debouncedModeToggle = funnel(
		() => {
			if (!window.mode) return;

			const currentMode = window.mode.getMode();

			switch (currentMode) {
				case ModeTypeEnum.Auto:
				case ModeTypeEnum.Light: {
					window.mode.setMode(ModeTypeEnum.Dark);
					break;
				}
				case ModeTypeEnum.Dark: {
					window.mode.setMode(ModeTypeEnum.Light);
					break;
				}
				default: {
					currentMode satisfies never;
					break;
				}
			}
		},
		{ triggerAt: 'start', minQuietPeriodMs: 500 },
	);

	toggleElement.addEventListener('click', () => {
		debouncedModeToggle.call();
	});
}
