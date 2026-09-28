export function setProgressBarOpacity(element: HTMLElement, value: number) {
	element.style.setProperty('opacity', String(value));
}

export function setProgressBarValue(element: HTMLElement, value: number) {
	element.style.setProperty('--progress-bar', String(value));
}
