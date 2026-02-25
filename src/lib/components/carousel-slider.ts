/**
 * Carousel slider element; this requires a container and some navigation buttons to work properly
 */
export class CarouselSlider extends HTMLElement {
	#handleClick = (event: Event) => {
		const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-carousel-nav]');

		if (!button) return;

		const direction = button.dataset.carouselNav;
		const container = this.querySelector<HTMLElement>('.carousel-container');

		if (!container) return;

		const itemWidth =
			container.querySelector('.carousel-item')?.clientWidth ?? container.clientWidth;
		const maxScroll = container.scrollWidth - container.clientWidth;
		const atStart = container.scrollLeft < itemWidth / 2;
		const atEnd = container.scrollLeft > maxScroll - itemWidth / 2;

		if (direction === 'prev' && atStart) {
			container.scrollTo({ left: maxScroll, behavior: 'smooth' });
		} else if (direction === 'next' && atEnd) {
			container.scrollTo({ left: 0, behavior: 'smooth' });
		} else {
			container.scrollBy({
				left: direction === 'next' ? itemWidth : -itemWidth,
				behavior: 'smooth',
			});
		}
	};

	connectedCallback() {
		this.addEventListener('click', this.#handleClick);
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.#handleClick);
	}
}

customElements.define('carousel-slider', CarouselSlider);

declare global {
	interface HTMLElementTagNameMap {
		'carousel-slider': CarouselSlider;
	}
}
