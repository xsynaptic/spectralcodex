export class ProgressBar extends HTMLElement {
	animationDuration = 300;

	connectedCallback() {
		this.ariaHidden = 'true';
	}

	setProgress(value: number) {
		this.style.setProperty('--progress-bar', String(value));
	}

	setOpacity(value: number) {
		this.style.setProperty('opacity', String(value));
	}
}
