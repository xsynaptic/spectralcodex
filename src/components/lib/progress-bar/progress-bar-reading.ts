import { funnel } from 'remeda';

const animationDuration = 300;

function readingBar(selector: string) {
	const element = document.querySelector<HTMLDivElement>(selector);
	const readingFrame = document.querySelector('[data-reading-frame]');

	if (!readingFrame) return;

	function setProgress(progressValue: number) {
		if (element) {
			element.style.setProperty('--progress-bar', String(progressValue));
		}
	}

	function setOpacity(opacityValue: number) {
		if (element) {
			element.style.setProperty('opacity', String(opacityValue));
			element.ariaHidden = opacityValue === 0 ? 'true' : 'false';
		}
	}

	function setFinished() {
		setProgress(1);
		globalThis.window.setTimeout(() => {
			setOpacity(0);
		}, animationDuration / 2);
	}

	// Initialize opacity value
	setOpacity(0);

	const onScrollHandler = funnel(
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
		{ triggerAt: 'both', minGapMs: 200 },
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
}

export function initialize(elementId: string) {
	document.addEventListener('DOMContentLoaded', () => {
		readingBar(elementId);
	});
}
