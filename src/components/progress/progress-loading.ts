const animationDuration = 300;

class ProgressLoading extends HTMLElement {
	#progress = 0.2;
	#trickleInterval: number | undefined;
	#thresholdTimeout: number | undefined;

	#setProgress(value: number) {
		this.style.setProperty('--progress-bar', String(value));
	}

	#setOpacity(value: number) {
		this.style.setProperty('opacity', String(value));
	}

	#handlePreparation = () => {
		this.#progress = 0;
		this.#setProgress(0);
		this.#thresholdTimeout = window.setTimeout(() => {
			this.#setOpacity(1);
			this.#trickleInterval = window.setInterval(() => {
				this.#progress += Math.random() * 0.03;
				this.#setProgress(this.#progress);
			}, animationDuration);
		}, 200);
	};

	#handleSwap = () => {
		if (!this.#thresholdTimeout) return;

		window.clearTimeout(this.#thresholdTimeout);
		window.clearInterval(this.#trickleInterval);
		this.#trickleInterval = undefined;

		this.#progress = 1;
		this.#setProgress(1);

		window.setTimeout(() => {
			this.#setOpacity(0);
		}, animationDuration / 2);

		window.setTimeout(() => {
			this.#progress = 0.2;
			this.#setProgress(0.2);
		}, animationDuration * 2);
	};

	connectedCallback() {
		this.ariaHidden = 'true';
		document.addEventListener('astro:before-preparation', this.#handlePreparation);
		document.addEventListener('astro:before-swap', this.#handleSwap);
	}

	disconnectedCallback() {
		document.removeEventListener('astro:before-preparation', this.#handlePreparation);
		document.removeEventListener('astro:before-swap', this.#handleSwap);
		window.clearTimeout(this.#thresholdTimeout);
		window.clearInterval(this.#trickleInterval);
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
