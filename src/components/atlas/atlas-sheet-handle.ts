import { trackMap } from '@spectralcodex/react-map-component/track';

import type { AtlasSheetRest } from '#lib/atlas/atlas-layout-factory.ts';

import { atlasSheetAttribute, atlasSheetRest } from '#lib/atlas/atlas-constants.ts';
import { getSheetStepRest, getSheetTapRest } from '#lib/atlas/atlas-sheet-factory.ts';
import {
	grabSheet,
	isSheetGrabbed,
	moveSheet,
	readPreferredSheetRest,
	readSheetRest,
	readSheetRests,
	storeSheetRest,
} from '#lib/atlas/atlas-sheet.ts';

const tapTolerancePx = 4;

const stepDirections: Record<string, 'down' | 'up'> = { ArrowDown: 'down', ArrowUp: 'up' };

function commitRest(rest: AtlasSheetRest) {
	trackMap({ data: { rest }, name: 'map-sheet-toggle' });
	storeSheetRest(rest);
}

function getReleaseKind(eventType: string, isDragged: boolean) {
	if (eventType !== 'pointerup') return 'cancel';

	return isDragged ? 'drag' : 'tap';
}

function getTapRest() {
	return getSheetTapRest({ from: readSheetRest(), preferred: readPreferredSheetRest() });
}

class AtlasSheetHandle extends HTMLElement {
	#controller: AbortController | undefined;
	#drag: ReturnType<typeof grabSheet>;
	#fromX = 0;
	#fromY = 0;
	#isDragged = false;
	#pointerId: number | undefined;

	connectedCallback() {
		const button = this.querySelector('button');

		if (!button) return;

		this.#controller = new AbortController();

		const { signal } = this.#controller;

		const stuckObserver = new IntersectionObserver(
			([entry]) => {
				if (!entry || isSheetGrabbed() || readSheetRest() !== atlasSheetRest.raised) return;

				this.toggleAttribute('data-stuck', entry.intersectionRatio < 1);
			},
			{ threshold: 1 },
		);

		const updateButton = () => {
			const isLowered = readSheetRest() === atlasSheetRest.lowered;
			const label = isLowered ? this.dataset.labelRaise : this.dataset.labelLower;

			button.setAttribute('aria-expanded', String(!isLowered));

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
		button.addEventListener('keydown', this.#handleKeyDown, { signal });
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

		if (isKeyboard) this.#moveTo(getTapRest());
	};

	// Chromium hit-tests a moving press again and drags the link now under it, which cancels the pointer
	#handleDragStart = (event: DragEvent) => {
		if (this.#pointerId !== undefined) event.preventDefault();
	};

	#handleKeyDown = (event: KeyboardEvent) => {
		const direction = stepDirections[event.key];

		if (!direction) return;

		event.preventDefault();
		this.#moveTo(getSheetStepRest({ direction, from: readSheetRest(), rests: readSheetRests() }));
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
		this.#isDragged = false;

		event.currentTarget.setPointerCapture(event.pointerId);
	};

	#handlePointerEnd = (event: PointerEvent) => {
		if (event.pointerId !== this.#pointerId) return;

		const drag = this.#drag;

		this.#drag = undefined;
		this.#pointerId = undefined;

		if (!drag) return;

		const rest = drag.release(getReleaseKind(event.type, this.#isDragged));

		if (rest) commitRest(rest);
	};

	#handlePointerMove = (event: PointerEvent) => {
		if (event.pointerId !== this.#pointerId || !this.#drag) return;

		const pointerPx = Math.hypot(event.clientX - this.#fromX, event.clientY - this.#fromY);

		if (pointerPx > tapTolerancePx) this.#isDragged = true;

		this.#drag.move(event.clientY - this.#fromY);
	};

	#moveTo(rest: AtlasSheetRest) {
		if (isSheetGrabbed() || rest === readSheetRest()) return;

		commitRest(rest);

		void moveSheet(rest);
	}
}

if (!customElements.get('atlas-sheet-handle')) {
	customElements.define('atlas-sheet-handle', AtlasSheetHandle);
}
