function getScrollTarget(container: HTMLElement, isForward: boolean): number {
	const itemWidth = container.querySelector('.carousel-item')?.clientWidth ?? container.clientWidth;
	const maxScroll = container.scrollWidth - container.clientWidth;

	if (isForward) {
		return container.scrollLeft > maxScroll - itemWidth / 2 ? 0 : container.scrollLeft + itemWidth;
	}

	return container.scrollLeft < itemWidth / 2 ? maxScroll : container.scrollLeft - itemWidth;
}

// Carousel slider element; this requires a container and some navigation buttons to work properly
class ImageCarousel extends HTMLElement {
	#handleClick = (event: Event) => {
		const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-carousel-nav]');

		if (!button) return;

		const container = this.querySelector<HTMLElement>('.carousel-container');

		if (!container) return;

		container.scrollTo({
			left: getScrollTarget(container, button.dataset.carouselNav === 'next'),
			behavior: 'smooth',
		});
	};

	connectedCallback() {
		this.addEventListener('click', this.#handleClick);
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.#handleClick);
	}
}

if (!customElements.get('image-carousel')) {
	customElements.define('image-carousel', ImageCarousel);
}

export {};

declare global {
	interface HTMLElementTagNameMap {
		'image-carousel': ImageCarousel;
	}
}
