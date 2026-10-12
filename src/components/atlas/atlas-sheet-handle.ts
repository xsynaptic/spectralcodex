import { atlasPaneSelector } from '#lib/atlas/atlas-constants.ts';
import { grabSheet, isSheetDown, moveSheet } from '#lib/atlas/atlas-sheet.ts';

const moveViewportShare = 0.2;
const tapTolerancePx = 4;

class AtlasSheetHandle extends HTMLElement {
	#controller: AbortController | undefined;
	#fromX = 0;
	#fromY = 0;
	#isDragged = false;
	#pane: HTMLElement | undefined;
	#pointerId: number | undefined;
	#restPx = 0;
	#travelPx = 0;

	connectedCallback() {
		const button = this.querySelector('button');
		const pane = this.closest<HTMLElement>(atlasPaneSelector);

		if (!button || !pane) return;

		this.#controller = new AbortController();

		const { signal } = this.#controller;

		const stuckObserver = new IntersectionObserver(
			([entry]) => {
				if (!entry || 'grabbing' in pane.dataset || isSheetDown()) return;

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
		stateObserver.observe(document.documentElement, { attributeFilter: ['data-atlas-sheet'] });
		signal.addEventListener('abort', () => {
			stuckObserver.disconnect();
			stateObserver.disconnect();
		});

		updateButton();

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

		if (isKeyboard) void moveSheet(!isSheetDown());
	};

	#handlePointerDown = (event: PointerEvent) => {
		if (this.#pointerId !== undefined || event.button !== 0) return;
		if (!(event.currentTarget instanceof Element)) return;

		const restPx = isSheetDown() ? this.getBoundingClientRect().top : 0;
		const pane = grabSheet();

		if (!pane) return;

		this.#pane = pane;
		this.#pointerId = event.pointerId;
		this.#fromX = event.clientX;
		this.#fromY = event.clientY;
		this.#restPx = restPx;
		this.#travelPx = 0;
		this.#isDragged = false;

		event.currentTarget.setPointerCapture(event.pointerId);
	};

	#handlePointerEnd = (event: PointerEvent) => {
		if (event.pointerId !== this.#pointerId) return;

		const isPast = this.#travelPx >= window.innerHeight * moveViewportShare;
		const isToggled = event.type === 'pointerup' && (isPast || !this.#isDragged);
		const isDown = isSheetDown();

		this.#pointerId = undefined;

		void moveSheet(isToggled ? !isDown : isDown);
	};

	#handlePointerMove = (event: PointerEvent) => {
		if (event.pointerId !== this.#pointerId || !this.#pane) return;

		const maxPx = this.#restPx || Infinity;
		const offsetPx = Math.min(maxPx, Math.max(0, this.#restPx + event.clientY - this.#fromY));

		this.#travelPx = Math.abs(offsetPx - this.#restPx);

		const pointerPx = Math.hypot(event.clientX - this.#fromX, event.clientY - this.#fromY);

		if (pointerPx > tapTolerancePx) this.#isDragged = true;

		this.#pane.style.translate = `0 ${String(offsetPx)}px`;
	};
}

if (!customElements.get('atlas-sheet-handle')) {
	customElements.define('atlas-sheet-handle', AtlasSheetHandle);
}
