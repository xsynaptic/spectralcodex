const animationDuration = 300;

class ProgressReading extends HTMLElement {
	#observer: IntersectionObserver | undefined;
	#scrollController: AbortController | undefined;
	#target: Element | undefined;
	#frame: number | undefined;
	#fadeOutTimer: number | undefined;

	#setProgress(value: number) {
		this.style.setProperty('--progress-bar', String(value));
	}

	#setOpacity(value: number) {
		this.style.setProperty('opacity', String(value));
	}

	#clearFadeOut() {
		if (this.#fadeOutTimer === undefined) return;

		clearTimeout(this.#fadeOutTimer);
		this.#fadeOutTimer = undefined;
	}

	#trackScroll() {
		if (this.#scrollController) return;

		this.#scrollController = new AbortController();

		const { signal } = this.#scrollController;

		window.addEventListener('resize', this.#onScroll, { passive: true, signal });
		window.addEventListener('scroll', this.#onScroll, { passive: true, signal });
		this.#onScroll();
	}

	#untrackScroll() {
		this.#scrollController?.abort();
		this.#scrollController = undefined;
	}

	#updateProgress = () => {
		this.#frame = undefined;

		if (!this.#target) return;

		const rect = this.#target.getBoundingClientRect();
		const scrollable = Math.max(1, rect.height - window.innerHeight);
		const progress = Math.min(Math.max(0, -rect.top / scrollable), 1);

		this.#setProgress(progress);

		// One fade per arrival at the end; scrolling back up cancels it before it lands
		if (progress < 1) {
			this.#clearFadeOut();
			this.#setOpacity(1);
			return;
		}

		if (this.#fadeOutTimer !== undefined) return;

		this.#fadeOutTimer = window.setTimeout(() => {
			this.#fadeOutTimer = undefined;
			this.#setOpacity(0);
		}, animationDuration / 2);
	};

	#onScroll = () => {
		if (this.#frame !== undefined) return;
		this.#frame = requestAnimationFrame(this.#updateProgress);
	};

	connectedCallback() {
		const selector = this.getAttribute('target') ?? '[data-reading-frame]';

		this.#target = document.querySelector(selector) ?? undefined;

		if (!this.#target) return;

		this.#observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						this.#trackScroll();
					} else {
						this.#untrackScroll();
					}
				}
			},
			{ threshold: 0 },
		);

		this.#observer.observe(this.#target);
	}

	disconnectedCallback() {
		this.#observer?.disconnect();
		this.#observer = undefined;
		this.#untrackScroll();
		this.#clearFadeOut();

		if (this.#frame !== undefined) {
			cancelAnimationFrame(this.#frame);
			this.#frame = undefined;
		}
	}
}

if (!customElements.get('progress-reading')) {
	customElements.define('progress-reading', ProgressReading);
}

export {};

declare global {
	interface HTMLElementTagNameMap {
		'progress-reading': ProgressReading;
	}
}
