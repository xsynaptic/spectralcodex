import type { AtlasPaneLimits } from '#lib/atlas/atlas-pane-factory.ts';

function readPaneTokens() {
	const style = getComputedStyle(document.documentElement);

	function readRem(name: string) {
		return Number(style.getPropertyValue(name).replace('rem', ''));
	}

	return {
		mapMinRem: readRem('--atlas-map-min'),
		paneDefaultRem: readRem('--atlas-pane-default'),
		paneMinRem: readRem('--atlas-pane-min'),
	};
}

let paneTokens: ReturnType<typeof readPaneTokens> | undefined;

// Declared in parts/theme.css, in rem; constants of the stylesheet, so one read serves the session
export function getPaneTokens() {
	if (paneTokens) return paneTokens;

	paneTokens = readPaneTokens();

	return paneTokens;
}

export function getPaneLimits(): AtlasPaneLimits {
	const root = document.documentElement;
	const rootFontSize = Number(getComputedStyle(root).fontSize.replace('px', ''));
	const { mapMinRem, paneMinRem } = getPaneTokens();

	return {
		mapMin: mapMinRem * rootFontSize,
		paneMin: paneMinRem * rootFontSize,
		rootFontSize,
		// Excludes the scrollbar, as the pane's right edge does
		viewportWidth: root.clientWidth,
	};
}
