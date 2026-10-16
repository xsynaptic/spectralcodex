const keyStepRem = 2;

// The same lengths atlas.css clamps `--atlas-pane-width` between, which covers restore and viewport resizes
export interface AtlasPaneLimits {
	mapMin: number;
	paneMin: number;
	rootFontSize: number;
	viewportWidth: number;
}

export function getPaneWidthRange({ mapMin, paneMin, viewportWidth }: AtlasPaneLimits) {
	return { max: Math.max(paneMin, viewportWidth - mapMin), min: paneMin };
}

export function clampPaneWidth(width: number, limits: AtlasPaneLimits) {
	const { max, min } = getPaneWidthRange(limits);

	return Math.min(Math.max(width, min), max);
}

// The divider is the pane's left edge, so moving it left widens the pane
export function getPaneWidthForKey(key: string, width: number, limits: AtlasPaneLimits) {
	const { max, min } = getPaneWidthRange(limits);
	const step = keyStepRem * limits.rootFontSize;

	switch (key) {
		case 'ArrowLeft': {
			return width + step;
		}
		case 'ArrowRight': {
			return width - step;
		}
		case 'End': {
			return max;
		}
		case 'Home': {
			return min;
		}
		default: {
			return;
		}
	}
}
