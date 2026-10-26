type MercatorPoint = [x: number, y: number];

const arcBend = 0.2;
const arcSteps = 32;

function toMercator([longitude, latitude]: [number, number]): MercatorPoint {
	return [
		longitude,
		(Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)) * 180) / Math.PI,
	];
}

function fromMercatorY(y: number) {
	return (Math.atan(Math.exp((y * Math.PI) / 180)) * 360) / Math.PI - 90;
}

// Mercator space keeps the bow looking the same at any latitude
function sampleArc(from: MercatorPoint, to: MercatorPoint): Array<[number, number]> {
	const chordX = to[0] - from[0];
	const chordY = to[1] - from[1];
	const control: MercatorPoint = [
		(from[0] + to[0]) / 2 - chordY * arcBend,
		(from[1] + to[1]) / 2 + chordX * arcBend,
	];

	return Array.from({ length: arcSteps + 1 }, (_, step) => {
		const progress = step / arcSteps;
		const remaining = 1 - progress;

		function getAxis(axis: 0 | 1) {
			return (
				remaining ** 2 * from[axis] +
				2 * remaining * progress * control[axis] +
				progress ** 2 * to[axis]
			);
		}

		return [getAxis(0), fromMercatorY(getAxis(1))];
	});
}

function isWestOf([x, y]: MercatorPoint, [otherX, otherY]: MercatorPoint) {
	return x === otherX ? y < otherY : x < otherX;
}

// Bowing west to east keeps a line curving the same way whichever end it starts from
export function getArcCoordinates(from: [number, number], to: [number, number]) {
	const fromPoint = toMercator(from);
	const toPoint = toMercator(to);

	if (isWestOf(fromPoint, toPoint)) return sampleArc(fromPoint, toPoint);

	return sampleArc(toPoint, fromPoint).toReversed();
}
