import type { ModeChangedEvent, ModeSystemType } from '#components/mode-manager/mode-types.ts';

import { ModeTypeEnum } from '#components/mode-manager/mode-types.ts';

function getOppositeMode(resolvedMode: string | undefined): ModeSystemType {
	return resolvedMode === ModeTypeEnum.Dark ? ModeTypeEnum.Light : ModeTypeEnum.Dark;
}

class ModeToggle extends HTMLElement {
	#lastClickTime = 0;

	#updateLabel(resolvedMode: string | undefined) {
		const label =
			getOppositeMode(resolvedMode) === ModeTypeEnum.Dark
				? this.dataset.labelDark
				: this.dataset.labelLight;

		if (!label) return;

		const button = this.querySelector('button');

		if (!button) return;

		button.setAttribute('aria-label', label);
		button.title = label;
	}

	#handleModeChanged = (event: Event) => {
		this.#updateLabel((event as ModeChangedEvent).detail.resolvedMode);
	};

	#handleClick = () => {
		const now = Date.now();

		if (now - this.#lastClickTime < 500) return;

		this.#lastClickTime = now;

		// Auto flips away from whatever the system currently shows, so every press changes the page
		document
			.querySelector('mode-manager')
			?.setMode(getOppositeMode(document.documentElement.dataset.mode));
	};

	connectedCallback() {
		this.addEventListener('click', this.#handleClick);
		document.addEventListener('mode-changed', this.#handleModeChanged);

		// The manager may have announced its mode before this listener existed
		this.#updateLabel(document.documentElement.dataset.mode);
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.#handleClick);
		document.removeEventListener('mode-changed', this.#handleModeChanged);
	}
}

if (!customElements.get('mode-toggle')) {
	customElements.define('mode-toggle', ModeToggle);
}

declare global {
	interface HTMLElementTagNameMap {
		'mode-toggle': ModeToggle;
	}
}
