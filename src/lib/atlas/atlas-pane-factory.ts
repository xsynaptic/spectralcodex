// Mirrored by the `clamp()` on `--atlas-pane-width` in atlas.css, which covers restore and viewport resizes
const paneMinRem = 40;
const mapMinRem = 20;
const keyStepRem = 2;

export interface AtlasPaneLimits {
	rootFontSize: number;
	viewportWidth: number;
}

export function getPaneWidthRange({ rootFontSize, viewportWidth }: AtlasPaneLimits) {
	const min = paneMinRem * rootFontSize;

	// Content styles follow viewport breakpoints, so the pane keeps its minimum when both cannot fit
	return { max: Math.max(min, viewportWidth - mapMinRem * rootFontSize), min };
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
			return clampPaneWidth(width + step, limits);
		}
		case 'ArrowRight': {
			return clampPaneWidth(width - step, limits);
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
