const tooltipEdgeGap = 8;

interface TooltipPoint {
	x: number;
	y: number;
	values: Array<string>;
}

// Progressive enhancement: without this the plot still reads, direct-labelled at its endpoint
class BuildStatsChart extends HTMLElement {
	#abortController: AbortController | undefined;
	#svg: SVGSVGElement | undefined;
	#crosshair: SVGGElement | undefined;
	#crosshairLine: SVGLineElement | undefined;
	#crosshairDot: SVGCircleElement | undefined;
	#tooltip: HTMLElement | undefined;
	#tooltipDate: HTMLElement | undefined;
	#tooltipRows: Array<HTMLElement> = [];
	#points: Array<TooltipPoint> = [];

	#getNearest(x: number): TooltipPoint | undefined {
		let nearest: TooltipPoint | undefined;
		let nearestDistance = Infinity;

		for (const point of this.#points) {
			const distance = Math.abs(point.x - x);

			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearest = point;
			}
		}

		return nearest;
	}

	#showTooltip(point: TooltipPoint) {
		if (!this.#tooltip) return;

		if (this.#tooltipDate) this.#tooltipDate.textContent = point.values[0] ?? '';

		for (const [rowIndex, row] of this.#tooltipRows.entries()) {
			const value = point.values[rowIndex + 1] ?? '';
			const target = row.querySelector('[data-tooltip-value]');

			if (target) target.textContent = value;
			row.hidden = value === '';
		}

		this.#tooltip.toggleAttribute('data-visible', true);
	}

	#moveCrosshair(point: TooltipPoint) {
		if (!this.#crosshair) return;

		const x = String(point.x);

		this.#crosshairLine?.setAttribute('x1', x);
		this.#crosshairLine?.setAttribute('x2', x);
		this.#crosshairDot?.setAttribute('cx', x);
		this.#crosshairDot?.setAttribute('cy', String(point.y));
		this.#crosshair.setAttribute('opacity', '1');
	}

	#positionTooltip(point: TooltipPoint, box: DOMRect, scale: number) {
		if (!this.#tooltip) return;

		const left = box.left - this.getBoundingClientRect().left + point.x * scale;
		// Nudged back only where it would otherwise hang off the window and widen the page
		const halfWidth = this.#tooltip.offsetWidth / 2;
		const center = box.left + point.x * scale;
		const overflowRight =
			center + halfWidth + tooltipEdgeGap - document.documentElement.clientWidth;
		const overflowLeft = tooltipEdgeGap - (center - halfWidth);

		this.#tooltip.style.left = `${String(left - Math.max(overflowRight, 0) + Math.max(overflowLeft, 0))}px`;
		this.#tooltip.style.top = `${String(point.y * scale + 18)}px`;
	}

	#handlePointerMove = (event: PointerEvent) => {
		if (event.pointerType === 'touch') return;

		if (!this.#svg) return;

		const box = this.#svg.getBoundingClientRect();
		const scale = box.width / this.#svg.viewBox.baseVal.width;

		if (scale <= 0) return;

		const point = this.#getNearest((event.clientX - box.left) / scale);

		if (!point) return;

		this.#moveCrosshair(point);
		this.#showTooltip(point);
		this.#positionTooltip(point, box, scale);
	};

	#handlePointerLeave = () => {
		this.#crosshair?.setAttribute('opacity', '0');
		this.#tooltip?.toggleAttribute('data-visible', false);
	};

	#resolveElements() {
		this.#svg = this.querySelector('svg') ?? undefined;
		this.#crosshair = this.querySelector<SVGGElement>('[data-chart-crosshair]') ?? undefined;
		this.#crosshairLine = this.querySelector<SVGLineElement>('[data-crosshair-line]') ?? undefined;
		this.#crosshairDot = this.querySelector<SVGCircleElement>('[data-crosshair-dot]') ?? undefined;
		this.#tooltip = this.querySelector<HTMLElement>('[data-chart-tooltip]') ?? undefined;
		this.#tooltipDate = this.querySelector<HTMLElement>('[data-tooltip-date]') ?? undefined;
		this.#tooltipRows = [...this.querySelectorAll<HTMLElement>('[data-tooltip-row]')];
	}

	connectedCallback() {
		this.#resolveElements();

		const data = this.querySelector('[data-chart-tooltips]')?.textContent;

		if (data) {
			try {
				this.#points = JSON.parse(data) as Array<TooltipPoint>;
			} catch {
				this.#points = [];
			}
		}

		const hit = this.querySelector<SVGRectElement>('[data-chart-hit]');

		if (!hit || this.#points.length === 0) return;

		this.#abortController = new AbortController();
		const { signal } = this.#abortController;

		hit.addEventListener('pointermove', this.#handlePointerMove, { signal });
		hit.addEventListener('pointerleave', this.#handlePointerLeave, { signal });
	}

	disconnectedCallback() {
		this.#abortController?.abort();
	}
}

if (!customElements.get('build-stats-chart')) {
	customElements.define('build-stats-chart', BuildStatsChart);
}

export {};

declare global {
	interface HTMLElementTagNameMap {
		'build-stats-chart': BuildStatsChart;
	}
}
