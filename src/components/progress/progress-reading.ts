const animationDuration = 300;

class ProgressReading extends HTMLElement {
	#observer: IntersectionObserver | undefined;
	#target: Element | undefined;
	#ticking = false;
	#frame: number | undefined;

	#setProgress(value: number) {
		this.style.setProperty('--progress-bar', String(value));
	}

	#setOpacity(value: number) {
		this.style.setProperty('opacity', String(value));
	}

	#updateProgress = () => {
		this.#frame = undefined;

		if (!this.#target) return;

		const rect = this.#target.getBoundingClientRect();
		const scrollable = Math.max(1, rect.height - globalThis.window.innerHeight);
		const progress = Math.min(Math.max(0, -rect.top / scrollable), 1);

		if (progress === 1) {
			this.#setProgress(1);
			globalThis.window.setTimeout(() => {
				this.#setOpacity(0);
			}, animationDuration / 2);
		} else {
			this.#setOpacity(1);
			this.#setProgress(progress);
		}

		this.#ticking = false;
	};

	#onScroll = () => {
		if (this.#ticking) return;
		this.#ticking = true;
		this.#frame = requestAnimationFrame(this.#updateProgress);
	};

	connectedCallback() {
		this.ariaHidden = 'true';

		const selector = this.getAttribute('target') ?? '[data-reading-frame]';
		this.#target = document.querySelector(selector) ?? undefined;

		if (!this.#target) return;

		this.#observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						globalThis.window.addEventListener('resize', this.#onScroll, { passive: true });
						globalThis.window.addEventListener('scroll', this.#onScroll, { passive: true });
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

		if (this.#frame !== undefined) {
			cancelAnimationFrame(this.#frame);
			this.#frame = undefined;
		}
	}
}

if (!customElements.get('progress-reading')) {
	customElements.define('progress-reading', ProgressReading);
}

// eslint-disable-next-line unicorn/require-module-specifiers -- required without another export, which we don't need
export {};

declare global {
	interface HTMLElementTagNameMap {
		'progress-reading': ProgressReading;
	}
}
