import type { MapSourceItem } from '@spectralcodex/map-codec';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';

type Position = [longitude: number, latitude: number];

export function getTargetPositions(
	items: ReadonlyArray<MapSourceItem>,
	targetIds: ReadonlyArray<string>,
): Array<Position> {
	const targetIdSet = new Set(targetIds);
	const positions: Array<Position> = [];

	for (const { geometry, properties } of items) {
		if (!targetIdSet.has(properties.id)) continue;

		// The codec types coordinates as a union that the geometry type does not narrow
		switch (geometry.type) {
			case GeometryTypeEnum.LineString: {
				positions.push(...(geometry.coordinates as Array<Position>));
				break;
			}
			case GeometryTypeEnum.Point: {
				positions.push(geometry.coordinates as Position);
				break;
			}
			// Polygons are not rendered anywhere yet
			case GeometryTypeEnum.Polygon: {
				break;
			}
		}
	}

	return positions;
}

// Past the cluster max zoom, so a Target reached from far out draws as its own point
const targetZoomDefault = 15;
const targetZoomMax = 17;
const targetZoomMin = 12;

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

// `fitZoom` is the closest zoom that still shows every position
export function getTargetZoom(zoom: number, fitZoom: number) {
	const limit = Math.min(fitZoom, targetZoomMax);

	if (zoom > limit) return limit;
	if (zoom < targetZoomMin) return Math.min(limit, targetZoomDefault);

	return zoom;
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
