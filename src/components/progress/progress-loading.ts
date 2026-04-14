import { ProgressBar } from '#components/progress/progress-base.ts';

class ProgressLoading extends ProgressBar {
	#progress = 0.2;
	#trickleInterval: number | undefined;
	#thresholdTimeout: number | undefined;

	#handlePreparation = () => {
		this.#progress = 0;
		this.setProgress(0);
		this.#thresholdTimeout = globalThis.window.setTimeout(() => {
			this.setOpacity(1);
			this.#trickleInterval = globalThis.window.setInterval(() => {
				this.#progress += Math.random() * 0.03;
				this.setProgress(this.#progress);
			}, this.animationDuration);
		}, 200);
	};

	#handleSwap = () => {
		if (!this.#thresholdTimeout) return;

		globalThis.window.clearTimeout(this.#thresholdTimeout);
		globalThis.window.clearInterval(this.#trickleInterval);
		this.#trickleInterval = undefined;

		this.#progress = 1;
		this.setProgress(1);

		globalThis.window.setTimeout(() => {
			this.setOpacity(0);
		}, this.animationDuration / 2);

		globalThis.window.setTimeout(() => {
			this.#progress = 0.2;
			this.setProgress(0.2);
		}, this.animationDuration * 2);
	};

	override connectedCallback() {
		super.connectedCallback();
		document.addEventListener('astro:before-preparation', this.#handlePreparation);
		document.addEventListener('astro:before-swap', this.#handleSwap);
	}

	disconnectedCallback() {
		document.removeEventListener('astro:before-preparation', this.#handlePreparation);
		document.removeEventListener('astro:before-swap', this.#handleSwap);
		globalThis.window.clearTimeout(this.#thresholdTimeout);
		globalThis.window.clearInterval(this.#trickleInterval);
	}
}

customElements.define('progress-loading', ProgressLoading);

declare global {
	interface HTMLElementTagNameMap {
		'progress-loading': ProgressLoading;
	}
}
