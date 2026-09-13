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
	#initialized = false;
	#controller: AbortController | undefined;
	#liveRegion: HTMLElement | undefined;
	#currentIndex = 0;

	#getContainer() {
		return this.querySelector<HTMLElement>('.carousel-container');
	}

	#getSlides() {
		return [
			...this.querySelectorAll<HTMLElement>(
				':scope .carousel-container:not(.carousel-container *) > *',
			),
		];
	}

	#getSlideLabel(index: number, total: number) {
		return (this.dataset.slideLabel ?? '{current} / {total}')
			.replace('{current}', () => String(index + 1))
			.replace('{total}', () => String(total));
	}

	#injectAria() {
		const slides = this.#getSlides();

		for (const [index, slide] of slides.entries()) {
			slide.setAttribute('role', 'group');
			slide.setAttribute('aria-roledescription', this.dataset.slideRoledescription ?? 'slide');
			slide.setAttribute('aria-label', this.#getSlideLabel(index, slides.length));
		}

		this.#liveRegion = document.createElement('div');
		this.#liveRegion.className = 'sr-only';
		this.#liveRegion.setAttribute('aria-live', 'polite');
		this.append(this.#liveRegion);
	}

	#announce(index: number) {
		const slides = this.#getSlides();
		const slide = slides[index];

		if (!slide || !this.#liveRegion) return;

		this.#currentIndex = index;

		const label = this.#getSlideLabel(index, slides.length);
		// eslint-disable-next-line unicorn/prefer-dom-node-text-content -- caption parts are flex items; textContent runs their words together
		const caption = (slide.querySelector('figcaption')?.innerText ?? '')
			.replaceAll(/\s+/g, ' ')
			.trim();

		this.#liveRegion.textContent = caption ? `${label}: ${caption}` : label;
	}

	// Covers swipes and keyboard scrolling as well as the buttons
	#handleScrollEnd = (event: Event) => {
		const container = event.currentTarget;

		if (!(container instanceof HTMLElement) || container.clientWidth === 0) return;

		const index = Math.round(container.scrollLeft / container.clientWidth);

		if (index === this.#currentIndex) return;

		this.#announce(index);
	};

	#handleClick = (event: Event) => {
		const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-carousel-nav]');

		if (!button) return;

		const container = this.#getContainer();

		if (!container) return;

		const left = getScrollTarget(container, button.dataset.carouselNav === 'next');
		const isReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

		container.scrollTo({ left, behavior: isReducedMotion ? 'instant' : 'smooth' });

		// Without scrollend only button presses can announce
		if (!('onscrollend' in window) && container.clientWidth > 0) {
			this.#announce(Math.round(left / container.clientWidth));
		}
	};

	connectedCallback() {
		if (!this.#initialized) {
			this.#injectAria();
			this.#initialized = true;
		}

		this.#controller = new AbortController();

		const { signal } = this.#controller;

		this.addEventListener('click', this.#handleClick, { signal });
		this.#getContainer()?.addEventListener('scrollend', this.#handleScrollEnd, {
			passive: true,
			signal,
		});
	}

	disconnectedCallback() {
		this.#controller?.abort();
		this.#controller = undefined;
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
