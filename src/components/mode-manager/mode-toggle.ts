// Type-only import keeps this script import-free so Astro inlines it
import type { ModeChangedEvent, ModeSystemType } from '#components/mode-manager/mode-types.ts';

class ModeToggle extends HTMLElement {
	#lastClickTime = 0;

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

	#handleClick = () => {
		const now = Date.now();

		if (now - this.#lastClickTime < 500) return;

		this.#lastClickTime = now;

		// Auto flips away from whatever the system currently shows, so every press changes the page
		document
			.querySelector('mode-manager')
			?.setMode(getOppositeMode(document.documentElement.dataset.mode));
	};

	#handleModeChanged = (event: Event) => {
		this.#updateLabel((event as ModeChangedEvent).detail.resolvedMode);
	};

	#updateLabel(resolvedMode: string | undefined) {
		const label =
			getOppositeMode(resolvedMode) === 'dark' ? this.dataset.labelDark : this.dataset.labelLight;

		if (!label) return;

		const button = this.querySelector('button');

		if (!button) return;

		button.setAttribute('aria-label', label);
		button.title = label;
	}
}

function getOppositeMode(resolvedMode: string | undefined): ModeSystemType {
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
