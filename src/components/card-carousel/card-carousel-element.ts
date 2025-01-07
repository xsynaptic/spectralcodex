/* eslint-disable unicorn/no-null */
/* eslint-disable unicorn/no-array-reduce */
import { funnel } from 'remeda';

// Force a value to be within bounds (0 < x < total); allows for values to "wrap around"
export const boundedValue = (value: number, total: number): number =>
	((value % total) + total) % total;

// Get the closest match from a numeric array
export const closestArrayValue = (value: number, sourceArray: Array<number>): number =>
	sourceArray.reduce((previous: number, current: number) => {
		if (Math.abs(current - value) < Math.abs(previous - value)) {
			return current;
		}
		return previous;
	});

// Note: this fudge factor accounts for subpixel rounding
const fuzzyPixels = 2;

customElements.define(
	'card-carousel',
	class CardCarousel extends HTMLElement {
		// eslint-disable-next-line @typescript-eslint/no-useless-constructor
		constructor() {
			super();
		}

		container: HTMLUListElement | null = null;
		previousButton: HTMLDivElement | null = null;
		previousHandler: EventListener | null = null;
		nextButton: HTMLDivElement | null = null;
		nextHandler: EventListener | null = null;
		resizeHandler: EventListener | null = null;

		connectedCallback() {
			this.container = this.querySelector<HTMLUListElement>('.carousel-container');
			this.previousButton = this.querySelector<HTMLDivElement>('.carousel-prev');
			this.nextButton = this.querySelector<HTMLDivElement>('.carousel-next');

			if (!this.container) return;

			if (this.previousButton) {
				this.previousHandler = () => {
					this.scrollCarousel('previous');
				};
				this.previousButton.addEventListener('click', this.previousHandler, true);
			}
			if (this.nextButton) {
				this.nextHandler = () => {
					this.scrollCarousel('next');
				};
				this.nextButton.addEventListener('click', this.nextHandler, true);
			}
			this.resizeHandler = () => {
				this.scrollCarousel();
			};
			window.addEventListener(
				'resize',
				() =>
					this.resizeHandler === null
						? undefined
						: funnel(this.resizeHandler, { minQuietPeriodMs: 500 }),
				true,
			);
		}

		scrollCarousel(scrollMode = 'none') {
			if (!this.container) return;

			const slidesDimensions = this.container.getBoundingClientRect();
			const slidesTotalWidth = this.container.scrollWidth - fuzzyPixels;
			const slidesVisibleWidth = slidesDimensions.width;
			const slidesOffsets: Array<number> = [];

			let targetRaw = this.container.scrollLeft;

			// Populate the offsets array with current positions of each slide
			for (const slideElement of this.container.children) {
				if (slideElement instanceof HTMLElement) {
					slidesOffsets.push(slideElement.offsetLeft - slidesDimensions.left, 10);
				}
			}

			// Remove the last slide from the array; we *never* want this to be the scroll target
			slidesOffsets.pop();

			// Calculate the approximate target based on which direction we're moving
			if (scrollMode === 'previous') {
				targetRaw -= slidesVisibleWidth;
			}
			if (scrollMode === 'next') {
				targetRaw += slidesVisibleWidth;
			}

			// Wrap the target value; allows for continual scrolling in one direction
			const targetBounded = boundedValue(targetRaw, slidesTotalWidth);

			this.container.scrollLeft = closestArrayValue(targetBounded, slidesOffsets);
		}

		disconnectedCallback() {
			if (this.previousButton && this.previousHandler) {
				this.previousButton.removeEventListener('click', this.previousHandler);
			}
			if (this.nextButton && this.nextHandler) {
				this.nextButton.removeEventListener('click', this.nextHandler);
			}
			if (this.resizeHandler) {
				window.removeEventListener('resize', this.resizeHandler, true);
			}
		}
	},
);
