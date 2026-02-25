import type { ModeManager } from '#lib/components/mode-manager.ts';

import { ModeTypeEnum } from '#lib/main/main-types.ts';

class ModeToggle extends HTMLElement {
	#lastClickTime = 0;

	#handleClick = () => {
		const now = Date.now();

		if (now - this.#lastClickTime < 500) return;

		this.#lastClickTime = now;

		const manager = document.querySelector<ModeManager>('mode-manager');

		if (!manager) return;

		const currentMode = manager.getMode();

		switch (currentMode) {
			case ModeTypeEnum.Auto:
			case ModeTypeEnum.Light: {
				manager.setMode(ModeTypeEnum.Dark);
				break;
			}
			case ModeTypeEnum.Dark: {
				manager.setMode(ModeTypeEnum.Light);
				break;
			}
			default: {
				currentMode satisfies never;
				break;
			}
		}
	};

	connectedCallback() {
		this.addEventListener('click', this.#handleClick);
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.#handleClick);
	}
}

customElements.define('mode-toggle', ModeToggle);

declare global {
	interface HTMLElementTagNameMap {
		'mode-toggle': ModeToggle;
	}
}
