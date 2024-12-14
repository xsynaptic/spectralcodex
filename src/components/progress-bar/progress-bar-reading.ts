import { debounce } from 'remeda';

const animationDuration = 300;

export const readingBar = (selector: string) => {
	const element = document.querySelector<HTMLDivElement>(selector);
	const readingFrame = document.querySelector('[data-reading-frame]');

	if (!element || !readingFrame) return;

	const setProgress = (progressValue: number) => {
		element.style.setProperty('--progress-bar', String(progressValue));
	};

	const setOpacity = (opacityValue: number) => {
		element.style.setProperty('opacity', String(opacityValue));
		element.ariaHidden = opacityValue === 0 ? 'true' : 'false';
	};

	const setFinished = () => {
		setProgress(1);
		globalThis.window.setTimeout(() => {
			setOpacity(0);
		}, animationDuration / 2);
	};

	// Initialize opacity value
	setOpacity(0);

	const onScrollHandler = debounce(
		() => {
			const readingFrameRect = readingFrame.getBoundingClientRect();
			const readingProgress = Math.min(
				Math.max(
					0,
					(globalThis.window.innerHeight - readingFrameRect.top) /
						(readingFrameRect.height + globalThis.window.innerHeight),
				),
				1,
			);

			if (readingProgress === 1) {
				setFinished();
			} else {
				setOpacity(1);
				setProgress(readingProgress);
			}
		},
		{ waitMs: 100 },
	);

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					globalThis.window.addEventListener('resize', onScrollHandler.call);
					globalThis.window.addEventListener('scroll', onScrollHandler.call);
					onScrollHandler.call(); // Initial call to set progress if already scrolled into view
				} else {
					globalThis.window.removeEventListener('resize', onScrollHandler.call);
					globalThis.window.removeEventListener('scroll', onScrollHandler.call);
				}
			}
		},
		{
			threshold: 0,
		},
	);

	observer.observe(readingFrame);
};
