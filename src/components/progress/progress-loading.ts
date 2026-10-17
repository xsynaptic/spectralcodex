import { setProgressBarOpacity, setProgressBarValue } from '#components/progress/progress-bar.ts';

const animationDuration = 300;

const startProgress = 0.2;

class ProgressLoading extends HTMLElement {
	#fadeTimeout: number | undefined;
	#isLoading = false;
	#progress = startProgress;
	#resetTimeout: number | undefined;
	#thresholdTimeout: number | undefined;
	#trickleInterval: number | undefined;

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
		this.#progress = startProgress;
		setProgressBarValue(this, startProgress);
		this.#thresholdTimeout = window.setTimeout(() => {
			this.#thresholdTimeout = undefined;
			setProgressBarOpacity(this, 1);
			this.#trickleInterval = window.setInterval(() => {
				this.#progress += Math.random() * 0.03;
				setProgressBarValue(this, this.#progress);
			}, animationDuration);
		}, 200);
	};

	#handleSwap = () => {
		if (!this.#isLoading) return;

		this.#isLoading = false;
		this.#clearLoadTimers();

		this.#progress = 1;
		setProgressBarValue(this, 1);

		this.#fadeTimeout = window.setTimeout(() => {
			this.#fadeTimeout = undefined;
			setProgressBarOpacity(this, 0);
		}, animationDuration);

		this.#resetTimeout = window.setTimeout(() => {
			this.#resetTimeout = undefined;
			this.#progress = startProgress;
			setProgressBarValue(this, startProgress);
		}, animationDuration * 2);
	};
}

if (!customElements.get('progress-loading')) {
	customElements.define('progress-loading', ProgressLoading);
}

declare global {
	interface HTMLElementTagNameMap {
		'progress-loading': ProgressLoading;
	}
}
