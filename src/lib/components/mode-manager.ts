import type { ModeChangedEvent, ModeGeneralType, ModeSystemType } from '#lib/main/main-types.ts';

import { ModeTypeEnum } from '#lib/main/main-types.ts';

function isModeValid(mode: string | undefined): mode is ModeGeneralType {
	return mode === ModeTypeEnum.Auto || mode === ModeTypeEnum.Dark || mode === ModeTypeEnum.Light;
}

export class ModeManager extends HTMLElement {
	static observedAttributes = ['default-mode'];

	#storageKey = 'scx-mode';
	#mediaMatcher: MediaQueryList | undefined;
	#systemMode: ModeSystemType = ModeTypeEnum.Dark;
	#handleMediaChange: ((event: MediaQueryListEvent) => void) | undefined;
	#storage: Storage | undefined;

	connectedCallback() {
		try {
			this.#storage = localStorage;
		} catch {
			// Fail silently
		}

		const defaultMode = this.#getDefaultMode();

		this.#mediaMatcher = globalThis.matchMedia(`(prefers-color-scheme: ${ModeTypeEnum.Light})`);
		this.#systemMode = this.#mediaMatcher.matches ? ModeTypeEnum.Light : ModeTypeEnum.Dark;

		this.#handleMediaChange = (event: MediaQueryListEvent) => {
			this.#systemMode = event.matches ? ModeTypeEnum.Light : ModeTypeEnum.Dark;
			this.#applyMode(this.getMode());
		};

		this.#mediaMatcher.addEventListener('change', this.#handleMediaChange);

		const stored = this.#storage?.getItem(this.#storageKey);
		const mode = stored && isModeValid(stored) ? stored : defaultMode;
		this.#applyMode(mode);
	}

	disconnectedCallback() {
		if (this.#mediaMatcher && this.#handleMediaChange) {
			this.#mediaMatcher.removeEventListener('change', this.#handleMediaChange);
		}
	}

	getMode(): ModeGeneralType {
		const stored = this.#storage?.getItem(this.#storageKey);
		return stored && isModeValid(stored) ? stored : this.#getDefaultMode();
	}

	setMode(mode: ModeGeneralType) {
		if (!isModeValid(mode)) return;
		this.#storage?.setItem(this.#storageKey, mode);
		this.#applyMode(mode);
	}

	getSystemMode(): ModeSystemType {
		return this.#systemMode;
	}

	getDefaultMode(): ModeGeneralType {
		return this.#getDefaultMode();
	}

	#getDefaultMode(): ModeGeneralType {
		const raw = this.getAttribute('default-mode');
		return raw && isModeValid(raw) ? raw : ModeTypeEnum.Auto;
	}

	#applyMode(mode: ModeGeneralType) {
		const resolvedMode = mode === ModeTypeEnum.Auto ? this.#systemMode : mode;

		document.documentElement.dataset.mode = resolvedMode;
		document.documentElement.style.colorScheme = resolvedMode;

		queueMicrotask(() => {
			document.dispatchEvent(
				new CustomEvent('mode-changed', {
					detail: {
						mode,
						systemMode: this.#systemMode,
						defaultMode: this.#getDefaultMode(),
						resolvedMode,
					},
				}) satisfies ModeChangedEvent,
			);
		});
	}
}

customElements.define('mode-manager', ModeManager);

declare global {
	interface HTMLElementTagNameMap {
		'mode-manager': ModeManager;
	}
}
