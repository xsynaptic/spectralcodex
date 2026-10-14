import { setProgressBarOpacity, setProgressBarValue } from '#components/progress/progress-bar.ts';

const animationDuration = 300;

class ProgressReading extends HTMLElement {
	#fadeOutTimer: number | undefined;
	#frame: number | undefined;
	#observer: IntersectionObserver | undefined;
	#scrollController: AbortController | undefined;
	#target: Element | undefined;

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

	#clearFadeOut() {
		if (this.#fadeOutTimer === undefined) return;

		clearTimeout(this.#fadeOutTimer);
		this.#fadeOutTimer = undefined;
	}

	#onScroll = () => {
		if (this.#frame !== undefined) return;
		this.#frame = requestAnimationFrame(this.#updateProgress);
	};

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
		const { scrollPaddingTop } = getComputedStyle(document.documentElement);
		const coveredPx = Number(scrollPaddingTop.replace('px', '')) || 0;
		const scrollable = Math.max(1, rect.height - (window.innerHeight - coveredPx));
		const progress = Math.min(Math.max(0, (coveredPx - rect.top) / scrollable), 1);

		setProgressBarValue(this, progress);

		// One fade per arrival at the end; scrolling back up cancels it before it lands
		if (progress < 1) {
			this.#clearFadeOut();
			setProgressBarOpacity(this, 1);
			return;
		}

		if (this.#fadeOutTimer !== undefined) return;

		this.#fadeOutTimer = window.setTimeout(() => {
			this.#fadeOutTimer = undefined;
			setProgressBarOpacity(this, 0);
		}, animationDuration / 2);
	};
}

if (!customElements.get('progress-reading')) {
	customElements.define('progress-reading', ProgressReading);
}

declare global {
	interface HTMLElementTagNameMap {
		'progress-reading': ProgressReading;
	}
}
