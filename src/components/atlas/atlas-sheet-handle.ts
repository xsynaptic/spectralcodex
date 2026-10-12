import { trackMap } from '@spectralcodex/react-map-component/track';

import { atlasSheetAttribute } from '#lib/atlas/atlas-constants.ts';
import { getSheetRelease } from '#lib/atlas/atlas-sheet-factory.ts';
import { grabSheet, isSheetDown, isSheetGrabbed, moveSheet } from '#lib/atlas/atlas-sheet.ts';

const tapTolerancePx = 4;

function trackSheetToggle(isDown: boolean) {
	trackMap({ data: { down: isDown }, name: 'map-sheet-toggle' });
}

class AtlasSheetHandle extends HTMLElement {
	#controller: AbortController | undefined;
	#drag: ReturnType<typeof grabSheet>;
	#fromX = 0;
	#fromY = 0;
	#isDragged = false;
	#pointerId: number | undefined;
	#travelPx = 0;

	connectedCallback() {
		const button = this.querySelector('button');

		if (!button) return;

		this.#controller = new AbortController();

		const { signal } = this.#controller;

		const stuckObserver = new IntersectionObserver(
			([entry]) => {
				if (!entry || isSheetGrabbed() || isSheetDown()) return;

				this.toggleAttribute('data-stuck', entry.intersectionRatio < 1);
			},
			{ threshold: 1 },
		);

		const updateButton = () => {
			const isDown = isSheetDown();
			const label = isDown ? this.dataset.labelRaise : this.dataset.labelLower;

			button.setAttribute('aria-expanded', String(!isDown));

			if (label) button.setAttribute('aria-label', label);
		};

		const stateObserver = new MutationObserver(updateButton);

		stuckObserver.observe(this);
		stateObserver.observe(document.documentElement, { attributeFilter: [atlasSheetAttribute] });
		signal.addEventListener('abort', () => {
			stuckObserver.disconnect();
			stateObserver.disconnect();
		});

		updateButton();

		document.addEventListener('dragstart', this.#handleDragStart, { signal });
		button.addEventListener('click', this.#handleClick, { signal });
		button.addEventListener('pointercancel', this.#handlePointerEnd, { signal });
		button.addEventListener('pointerdown', this.#handlePointerDown, { signal });
		button.addEventListener('pointermove', this.#handlePointerMove, { signal });
		button.addEventListener('pointerup', this.#handlePointerEnd, { signal });
	}

	disconnectedCallback() {
		this.#controller?.abort();
		this.#controller = undefined;
	}

	#handleClick = (event: MouseEvent) => {
		const isKeyboard = event.detail === 0;

		if (isKeyboard) this.#toggle();
	};

	#handleDragStart = (event: DragEvent) => {
		if (this.#pointerId !== undefined) event.preventDefault();
	};

	#handlePointerDown = (event: PointerEvent) => {
		if (this.#pointerId !== undefined || event.button !== 0) return;
		if (!(event.currentTarget instanceof Element)) return;

		const drag = grabSheet();

		if (!drag) return;

		this.#drag = drag;
		this.#pointerId = event.pointerId;
		this.#fromX = event.clientX;
		this.#fromY = event.clientY;
		this.#travelPx = 0;
		this.#isDragged = false;

		event.currentTarget.setPointerCapture(event.pointerId);
	};

	#handlePointerEnd = (event: PointerEvent) => {
		if (event.pointerId !== this.#pointerId) return;

		const isToggled =
			getSheetRelease({
				eventType: event.type,
				isDragged: this.#isDragged,
				travelPx: this.#travelPx,
				viewportHeight: window.innerHeight,
			}) === 'toggle';
		const isDown = isSheetDown() !== isToggled;

		const isReleased = this.#drag?.release(isDown) ?? false;

		if (isToggled && isReleased) trackSheetToggle(isDown);

		this.#drag = undefined;
		this.#pointerId = undefined;
	};

	#handlePointerMove = (event: PointerEvent) => {
		if (event.pointerId !== this.#pointerId || !this.#drag) return;

		const pointerPx = Math.hypot(event.clientX - this.#fromX, event.clientY - this.#fromY);

		if (pointerPx > tapTolerancePx) this.#isDragged = true;

		this.#travelPx = this.#drag.move(event.clientY - this.#fromY);
	};

	#toggle() {
		const isDown = !isSheetDown();

		trackSheetToggle(isDown);

		void moveSheet(isDown);
	}
}

if (!customElements.get('atlas-sheet-handle')) {
	customElements.define('atlas-sheet-handle', AtlasSheetHandle);
}
