export class ProgressBar extends HTMLElement {
	animationDuration = 300;

	connectedCallback() {
		this.ariaHidden = 'true';
		this.style.setProperty('pointer-events', 'none');
		this.style.setProperty('position', 'fixed');
		this.style.setProperty('top', '0');
		this.style.setProperty('left', '0');
		this.style.setProperty('width', '100%');
		this.style.setProperty('opacity', '0');
		this.style.setProperty('transform', 'translate3d(0, 0, 0) scaleX(var(--progress-bar, 0))');
		this.style.setProperty('transform-origin', '0');
		this.style.setProperty(
			'transition',
			[
				'background-color 100ms 100ms ease-in-out',
				'opacity 150ms 150ms ease-in',
				'transform 300ms ease-out',
			].join(', '),
		);
	}

	setProgress(value: number) {
		this.style.setProperty('--progress-bar', String(value));
	}

	setOpacity(value: number) {
		this.style.setProperty('opacity', String(value));
	}
}
