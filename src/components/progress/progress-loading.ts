const animationDuration = 300;

class ProgressLoading extends HTMLElement {
	#progress = 0.2;
	#isLoading = false;
	#trickleInterval: number | undefined;
	#thresholdTimeout: number | undefined;
	#fadeTimeout: number | undefined;
	#resetTimeout: number | undefined;

	#setProgress(value: number) {
		this.style.setProperty('--progress-bar', String(value));
	}

	#setOpacity(value: number) {
		this.style.setProperty('opacity', String(value));
	}

	#clearLoadTimers() {
		window.clearTimeout(this.#thresholdTimeout);
		window.clearInterval(this.#trickleInterval);
		this.#thresholdTimeout = undefined;
		this.#trickleInterval = undefined;
	}

	#handlePreparation = () => {
		// A second navigation before the swap strands the previous run's timers; the trickle would never stop
		this.#clearLoadTimers();
		window.clearTimeout(this.#fadeTimeout);
		window.clearTimeout(this.#resetTimeout);
		this.#fadeTimeout = undefined;
		this.#resetTimeout = undefined;

		this.#isLoading = true;
		this.#progress = 0;
		this.#setProgress(0);
		this.#thresholdTimeout = window.setTimeout(() => {
			this.#thresholdTimeout = undefined;
			this.#setOpacity(1);
			this.#trickleInterval = window.setInterval(() => {
				this.#progress += Math.random() * 0.03;
				this.#setProgress(this.#progress);
			}, animationDuration);
		}, 200);
	};

	#handleSwap = () => {
		if (!this.#isLoading) return;

		this.#isLoading = false;
		this.#clearLoadTimers();

		this.#progress = 1;
		this.#setProgress(1);

		this.#fadeTimeout = window.setTimeout(() => {
			this.#fadeTimeout = undefined;
			this.#setOpacity(0);
		}, animationDuration / 2);

		this.#resetTimeout = window.setTimeout(() => {
			this.#resetTimeout = undefined;
			this.#progress = 0.2;
			this.#setProgress(0.2);
		}, animationDuration * 2);
	};

	connectedCallback() {
		document.addEventListener('astro:before-preparation', this.#handlePreparation);
		document.addEventListener('astro:before-swap', this.#handleSwap);
	}

	disconnectedCallback() {
		document.removeEventListener('astro:before-preparation', this.#handlePreparation);
		document.removeEventListener('astro:before-swap', this.#handleSwap);

		// Fires mid-swap on browsers without moveBefore; the fade and reset must outlive it or the bar sticks at full
		this.#clearLoadTimers();
	}
}

if (!customElements.get('progress-loading')) {
	customElements.define('progress-loading', ProgressLoading);
}

export {};

declare global {
	interface HTMLElementTagNameMap {
		'progress-loading': ProgressLoading;
	}
}
