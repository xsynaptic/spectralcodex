import type {
	ModeChangedEvent,
	ModeGeneralType,
	ModeSystemType,
} from '#components/mode/mode-types.ts';

import { isModeValid, ModeTypeEnum } from '#components/mode/mode-types.ts';

/**
 * Adapted from Astro Tips!
 * @link - https://astro-tips.dev/recipes/dark-mode/
 */
export function modeManager(defaultModeId: string | undefined) {
	const storageKey = 'scx-mode';
	const store =
		typeof localStorage === 'undefined'
			? {
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					getItem: () => {},
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					setItem: () => {},
				}
			: localStorage;

	const defaultModeRaw = defaultModeId
		? document.querySelector<HTMLScriptElement>(defaultModeId)?.dataset.defaultMode
		: undefined;
	const defaultMode = isModeValid(defaultModeRaw) ? defaultModeRaw : ModeTypeEnum.Auto;

	const mediaMatcher = window.matchMedia(`(prefers-color-scheme: ${ModeTypeEnum.Light})`);

	let systemMode: ModeSystemType = mediaMatcher.matches ? ModeTypeEnum.Light : ModeTypeEnum.Dark;

	function getMode(): ModeGeneralType {
		const stored = store.getItem(storageKey);

		return stored && isModeValid(stored) ? stored : defaultMode;
	}

	function applyMode(mode: ModeGeneralType) {
		const resolvedMode = mode === ModeTypeEnum.Auto ? systemMode : mode;

		document.documentElement.dataset.mode = resolvedMode;
		document.documentElement.style.colorScheme = resolvedMode;

		// Dispatch event after DOM is updated
		queueMicrotask(() => {
			document.dispatchEvent(
				new CustomEvent('mode-changed', {
					detail: { mode, systemMode, defaultMode, resolvedMode },
				}) satisfies ModeChangedEvent,
			);
		});
	}

	function setMode(mode: ModeGeneralType = defaultMode) {
		if (!isModeValid(mode)) return;
		store.setItem(storageKey, mode);
		applyMode(mode);
	}

	function handleMediaChange(event: MediaQueryListEvent) {
		systemMode = event.matches ? ModeTypeEnum.Light : ModeTypeEnum.Dark;
		applyMode(getMode());
	}

	mediaMatcher.addEventListener('change', handleMediaChange);

	/** Note: this is not currently used and may have no real value */
	function cleanup() {
		mediaMatcher.removeEventListener('change', handleMediaChange);
	}

	return {
		setMode,
		getMode,
		getSystemMode: () => systemMode,
		getDefaultMode: () => defaultMode,
		cleanup,
	};
}
