import { mapSyncEventName } from '@spectralcodex/react-map-component/constants';

import {
	clampPaneWidth,
	getPaneWidthForKey,
	getPaneWidthRange,
} from '#lib/atlas/atlas-pane-factory.ts';
import { getPaneLimits, getPaneWidth, requestPaneWidth } from '#lib/atlas/atlas-pane.ts';

class AtlasDivider extends HTMLElement {
	#dragOrigin = 0;
	#dragWidth: number | undefined;
	#handle: HTMLElement | undefined;

	connectedCallback() {
		this.#handle = this.querySelector<HTMLElement>('[role="separator"]') ?? undefined;

		// A tab stop only once the keys are answered
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

		// Keeps the drag from selecting text on either side
		event.preventDefault();
		this.#handle.setPointerCapture(event.pointerId);
		this.#handle.dataset.dragging = '';
		this.#dragOrigin = getPaneWidth();
		this.#handle.focus();
	};

	// The drag moves only the divider; the pane and the map resize once, on release
	#handlePointerMove = (event: PointerEvent) => {
		if (!this.#handle?.hasPointerCapture(event.pointerId)) return;

		const limits = getPaneLimits();

		// Whole pixels keep the dragged hairline and the dashed edge on the same grid
		this.#dragWidth = Math.round(clampPaneWidth(limits.viewportWidth - event.clientX, limits));
		this.style.right = `${String(this.#dragWidth)}px`;
		this.style.setProperty(
			'--atlas-drag-offset',
			`${String(this.#dragWidth - this.#dragOrigin)}px`,
		);
	};

	#handlePointerUp = (event: PointerEvent) => {
		if (!this.#handle?.hasPointerCapture(event.pointerId)) return;

		this.#handle.releasePointerCapture(event.pointerId);
		delete this.#handle.dataset.dragging;
		this.style.removeProperty('right');
		this.style.removeProperty('--atlas-drag-offset');

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
