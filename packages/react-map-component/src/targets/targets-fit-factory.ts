type Position = [longitude: number, latitude: number];

const targetZoomDefault = 15;
const targetZoomMax = 17;
const targetZoomMin = 12;
const targetInViewZoomMin = 10;

export function getTargetBounds(
	positions: ReadonlyArray<Position>,
): [southwest: Position, northeast: Position] | undefined {
	const [first, ...rest] = positions;

	if (!first) return;

	let [west, south] = first;
	let [east, north] = first;

	for (const [longitude, latitude] of rest) {
		west = Math.min(west, longitude);
		south = Math.min(south, latitude);
		east = Math.max(east, longitude);
		north = Math.max(north, latitude);
	}

	return [
		[west, south],
		[east, north],
	];
}

export function getTargetZoom(zoom: number, fitZoom: number) {
	const limit = Math.min(fitZoom, targetZoomMax);

	if (zoom > limit) return limit;
	if (zoom < targetZoomMin) return Math.min(limit, targetZoomDefault);

	return zoom;
}

export function isInView(
	points: ReadonlyArray<{ x: number; y: number }>,
	frame: Record<'bottom' | 'left' | 'right' | 'top', number>,
	zoom: number,
) {
	if (points.length === 0 || zoom < targetInViewZoomMin) return false;

	return points.every(
		({ x, y }) => x >= frame.left && x <= frame.right && y >= frame.top && y <= frame.bottom,
	);
}

const fitDurationBase = 450;
const fitDurationPerZoomLevel = 200;
const fitDurationPerScreen = 250;
const fitDurationMax = 1800;

export function getTargetDuration(zoomLevels: number, screens: number) {
	return Math.min(
		fitDurationMax,
		fitDurationBase +
			Math.abs(zoomLevels) * fitDurationPerZoomLevel +
			screens * fitDurationPerScreen,
	);
}
