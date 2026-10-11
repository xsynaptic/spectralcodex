import type {
	ModeChangedEvent,
	ModeGeneralType,
	ModeSystemType,
} from '#components/mode-manager/mode-types.ts';

import { modeStorageKey } from '#components/mode-manager/mode-constants.ts';
import { ModeTypeEnum } from '#components/mode-manager/mode-types.ts';

const validModes: ReadonlySet<string> = new Set([
	ModeTypeEnum.Auto,
	ModeTypeEnum.Dark,
	ModeTypeEnum.Light,
]);

class ModeManager extends HTMLElement {
	#mediaMatcher: MediaQueryList | undefined;
	#mode: ModeGeneralType = ModeTypeEnum.Auto;
	#systemMode: ModeSystemType = ModeTypeEnum.Dark;

	connectedCallback() {
		this.#mediaMatcher = matchMedia(`(prefers-color-scheme: ${ModeTypeEnum.Light})`);
		this.#systemMode = this.#mediaMatcher.matches ? ModeTypeEnum.Light : ModeTypeEnum.Dark;
		this.#mediaMatcher.addEventListener('change', this.#handleMediaChange);

		let stored: string | undefined;

		try {
			stored = localStorage.getItem(modeStorageKey) ?? undefined;
		} catch {
			// localStorage unavailable
		}

		if (isModeValid(stored)) this.#mode = stored;

		this.#applyMode(this.#mode);
	}

	disconnectedCallback() {
		this.#mediaMatcher?.removeEventListener('change', this.#handleMediaChange);
	}

	getMode(): ModeGeneralType {
		return this.#mode;
	}

	setMode(mode: ModeGeneralType) {
		if (!isModeValid(mode)) return;

		this.#mode = mode;
		this.#applyMode(mode);

		try {
			localStorage.setItem(modeStorageKey, mode);
		} catch {
			// The mode still applies when the write fails
		}
	}

	#applyMode(mode: ModeGeneralType) {
		const resolvedMode = mode === ModeTypeEnum.Auto ? this.#systemMode : mode;

		document.documentElement.dataset.mode = resolvedMode;
		document.documentElement.style.colorScheme = resolvedMode;

		this.#applyThemeColor();

		queueMicrotask(() => {
			document.dispatchEvent(
				new CustomEvent('mode-changed', {
					detail: {
						mode,
						resolvedMode,
						systemMode: this.#systemMode,
					},
				}) satisfies ModeChangedEvent,
			);
		});
	}

	#applyThemeColor() {
		const themeColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--color-body-bg')
			.trim();
		if (!themeColor) return;
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
	}

	#handleMediaChange = (event: MediaQueryListEvent) => {
		this.#systemMode = event.matches ? ModeTypeEnum.Light : ModeTypeEnum.Dark;
		this.#applyMode(this.#mode);
	};
}

function isModeValid(mode: string | undefined): mode is ModeGeneralType {
	return mode !== undefined && validModes.has(mode);
}

if (!customElements.get('mode-manager')) {
	customElements.define('mode-manager', ModeManager);
}

declare global {
	interface HTMLElementTagNameMap {
		'mode-manager': ModeManager;
	}
}
