import { modeAttribute, modeChangedEventName } from '@spectralcodex/shared/constants';

import type { ModeChangedEvent, ModeSystemType } from '#components/mode-manager/mode-types.ts';

class ModeToggle extends HTMLElement {
	#lastClickTime = 0;

	connectedCallback() {
		this.addEventListener('click', this.#handleClick);
		document.addEventListener(modeChangedEventName, this.#handleModeChanged);

		// The manager may have announced its mode before this listener was added
		this.#updateLabel(document.documentElement.getAttribute(modeAttribute));
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.#handleClick);
		document.removeEventListener(modeChangedEventName, this.#handleModeChanged);
	}

	#handleClick = () => {
		const now = Date.now();

		if (now - this.#lastClickTime < 500) return;

		this.#lastClickTime = now;

		document
			.querySelector('mode-manager')
			?.setMode(getOppositeMode(document.documentElement.getAttribute(modeAttribute)));
	};

	#handleModeChanged = (event: Event) => {
		this.#updateLabel((event as ModeChangedEvent).detail.resolvedMode);
	};

	#updateLabel(resolvedMode: null | string) {
		const nextMode = getOppositeMode(resolvedMode);
		const label = nextMode === 'dark' ? this.dataset.labelDark : this.dataset.labelLight;

		if (!label) return;

		const button = this.querySelector('button');

		if (!button) return;

		button.setAttribute('aria-label', label);
		button.title = label;
		button.dataset.umamiEventMode = nextMode;
	}
}

function getOppositeMode(resolvedMode: null | string): ModeSystemType {
	return resolvedMode === 'dark' ? 'light' : 'dark';
}

if (!customElements.get('mode-toggle')) {
	customElements.define('mode-toggle', ModeToggle);
}

declare global {
	interface HTMLElementTagNameMap {
		'mode-toggle': ModeToggle;
	}
}
