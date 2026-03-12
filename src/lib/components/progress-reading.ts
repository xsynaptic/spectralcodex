import { ProgressBar } from '#lib/components/progress-base.ts';

class ProgressReading extends ProgressBar {
	#observer: IntersectionObserver | undefined;
	#target: Element | undefined;
	#ticking = false;

	#updateProgress = () => {
		if (!this.#target) return;

		const rect = this.#target.getBoundingClientRect();
		const progress = Math.min(
			Math.max(
				0,
				(globalThis.window.innerHeight - rect.top) / (rect.height + globalThis.window.innerHeight),
			),
			1,
		);

		if (progress === 1) {
			this.setProgress(1);
			globalThis.window.setTimeout(() => {
				this.setOpacity(0);
			}, this.animationDuration / 2);
		} else {
			this.setOpacity(1);
			this.setProgress(progress);
		}

		this.#ticking = false;
	};

	#onScroll = () => {
		if (this.#ticking) return;
		this.#ticking = true;
		requestAnimationFrame(this.#updateProgress);
	};

	override connectedCallback() {
		super.connectedCallback();

		const selector = this.getAttribute('target') ?? '[data-reading-frame]';
		this.#target = document.querySelector(selector) ?? undefined;

		if (!this.#target) return;

		this.#observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						globalThis.window.addEventListener('resize', this.#onScroll);
						globalThis.window.addEventListener('scroll', this.#onScroll);
						this.#onScroll();
					} else {
						globalThis.window.removeEventListener('resize', this.#onScroll);
						globalThis.window.removeEventListener('scroll', this.#onScroll);
					}
				}
			},
			{ threshold: 0 },
		);

		this.#observer.observe(this.#target);
	}

	disconnectedCallback() {
		this.#observer?.disconnect();
		globalThis.window.removeEventListener('resize', this.#onScroll);
		globalThis.window.removeEventListener('scroll', this.#onScroll);
	}
}

customElements.define('progress-reading', ProgressReading);

declare global {
	interface HTMLElementTagNameMap {
		'progress-reading': ProgressReading;
	}
}
