type MercatorPoint = [x: number, y: number];

export interface ArcEnd {
	coordinates: [number, number];
	displayedCoordinates: [number, number];
}

interface BentEnd {
	offset: MercatorPoint;
	point: MercatorPoint;
}

const arcBend = 0.2;
const arcEndShare = 0.25;

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

function subtract([x, y]: MercatorPoint, [otherX, otherY]: MercatorPoint): MercatorPoint {
	return [x - otherX, y - otherY];
}

function getLength([x, y]: MercatorPoint) {
	return Math.hypot(x, y);
}

function smoothStep(edgeStart: number, edgeEnd: number, value: number) {
	const progress = Math.min(Math.max((value - edgeStart) / (edgeEnd - edgeStart), 0), 1);

	return progress * progress * (3 - 2 * progress);
}

// Bending an end further than its share of the line hooks it back on itself, so redraw the whole arc instead
// Zoom scales both sides of that comparison, so the choice only changes when clusters do
function getBentEnds(from: ArcEnd, to: ArcEnd) {
	const fromPoint = toMercator(from.coordinates);
	const toPoint = toMercator(to.coordinates);
	const fromDisplayed = toMercator(from.displayedCoordinates);
	const toDisplayed = toMercator(to.displayedCoordinates);
	const fromOffset = subtract(fromDisplayed, fromPoint);
	const toOffset = subtract(toDisplayed, toPoint);
	const bendLimit = getLength(subtract(toPoint, fromPoint)) * arcEndShare;

	if (getLength(fromOffset) > bendLimit || getLength(toOffset) > bendLimit) {
		return {
			from: { offset: [0, 0], point: fromDisplayed },
			to: { offset: [0, 0], point: toDisplayed },
		} satisfies Record<string, BentEnd>;
	}

	return {
		from: { offset: fromOffset, point: fromPoint },
		to: { offset: toOffset, point: toPoint },
	} satisfies Record<string, BentEnd>;
}

// Mercator space keeps the bow looking the same at any latitude
// Bending only the ends keeps the middle still as clusters form and break
function sampleArc(from: BentEnd, to: BentEnd): Array<[number, number]> {
	const [chordX, chordY] = subtract(to.point, from.point);
	const control: MercatorPoint = [
		(from.point[0] + to.point[0]) / 2 - chordY * arcBend,
		(from.point[1] + to.point[1]) / 2 + chordX * arcBend,
	];

	return Array.from({ length: arcSteps + 1 }, (_, step) => {
		const progress = (1 - Math.cos((Math.PI * step) / arcSteps)) / 2;
		const remaining = 1 - progress;
		const fromWeight = 1 - smoothStep(0, arcEndShare, progress);
		const toWeight = smoothStep(1 - arcEndShare, 1, progress);

		function getAxis(axis: 0 | 1) {
			return (
				remaining ** 2 * from.point[axis] +
				2 * remaining * progress * control[axis] +
				progress ** 2 * to.point[axis] +
				from.offset[axis] * fromWeight +
				to.offset[axis] * toWeight
			);
		}

		return [getAxis(0), fromMercatorY(getAxis(1))];
	});
}

function isWestOf([x, y]: MercatorPoint, [otherX, otherY]: MercatorPoint) {
	return x === otherX ? y < otherY : x < otherX;
}

// Bowing west to east keeps a line curving the same way whichever end it starts from
export function getArcCoordinates(from: ArcEnd, to: ArcEnd) {
	const ends = getBentEnds(from, to);

	if (isWestOf(ends.from.point, ends.to.point)) return sampleArc(ends.from, ends.to);

	return sampleArc(ends.to, ends.from).toReversed();
}
