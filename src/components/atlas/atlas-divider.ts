import { mapSyncEventName } from '@spectralcodex/react-map-component/constants';

import { atlasPaneSizeProperty } from '#lib/atlas/atlas-constants.ts';
import { getPaneWidthForKey, getPaneWidthRange } from '#lib/atlas/atlas-pane-factory.ts';
import { getPaneLimits, getPaneWidth, requestPaneWidth } from '#lib/atlas/atlas-pane.ts';

class AtlasDivider extends HTMLElement {
	#dragWidth: number | undefined;
	#handle: HTMLElement | undefined;

	connectedCallback() {
		this.#handle = this.querySelector<HTMLElement>('[role="separator"]') ?? undefined;

		if (this.#handle) this.#handle.tabIndex = 0;

		this.#handle?.addEventListener('pointerdown', this.#handlePointerDown);
		this.#handle?.addEventListener('pointermove', this.#handlePointerMove);
		this.#handle?.addEventListener('pointerup', this.#handlePointerUp);
		this.#handle?.addEventListener('pointercancel', this.#handlePointerUp);
		this.#handle?.addEventListener('keydown', this.#handleKeyDown);
		window.addEventListener('resize', this.#updateValue);
		document.addEventListener(mapSyncEventName, this.#updateValue);

		this.#updateValue();
	}

	disconnectedCallback() {
		this.#handle?.removeEventListener('pointerdown', this.#handlePointerDown);
		this.#handle?.removeEventListener('pointermove', this.#handlePointerMove);
		this.#handle?.removeEventListener('pointerup', this.#handlePointerUp);
		this.#handle?.removeEventListener('pointercancel', this.#handlePointerUp);
		this.#handle?.removeEventListener('keydown', this.#handleKeyDown);
		window.removeEventListener('resize', this.#updateValue);
		document.removeEventListener(mapSyncEventName, this.#updateValue);
	}

	#handleKeyDown = (event: KeyboardEvent) => {
		const width = getPaneWidthForKey(event.key, getPaneWidth(), getPaneLimits());

		if (width === undefined) return;

		event.preventDefault();
		this.#setPaneWidth(width);
	};

	#handlePointerDown = (event: PointerEvent) => {
		if (event.button !== 0 || !this.#handle) return;

		event.preventDefault();
		this.#handle.setPointerCapture(event.pointerId);
		this.#handle.dataset.dragging = '';
		this.#handle.focus();
	};

	#handlePointerMove = (event: PointerEvent) => {
		if (!this.#handle?.hasPointerCapture(event.pointerId)) return;

		this.#dragWidth = Math.round(document.documentElement.clientWidth - event.clientX);
		this.style.setProperty(atlasPaneSizeProperty, `${String(this.#dragWidth)}px`);
	};

	#handlePointerUp = (event: PointerEvent) => {
		if (!this.#handle?.hasPointerCapture(event.pointerId)) return;

		this.#handle.releasePointerCapture(event.pointerId);
		delete this.#handle.dataset.dragging;
		this.style.removeProperty(atlasPaneSizeProperty);

		if (this.#dragWidth === undefined) return;

		this.#setPaneWidth(this.#dragWidth);
		this.#dragWidth = undefined;
	};

	#setPaneWidth(width: number) {
		requestPaneWidth(width);
		this.#updateValue();
	}

	#updateValue = () => {
		const { max, min } = getPaneWidthRange(getPaneLimits());

		this.#handle?.setAttribute('aria-valuemin', String(Math.round(min)));
		this.#handle?.setAttribute('aria-valuemax', String(Math.round(max)));
		this.#handle?.setAttribute('aria-valuenow', String(Math.round(getPaneWidth())));
	};
}

if (!customElements.get('atlas-divider')) {
	customElements.define('atlas-divider', AtlasDivider);
}
