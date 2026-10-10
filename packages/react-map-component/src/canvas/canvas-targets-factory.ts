import type { MapSourceItem } from '@spectralcodex/map-codec';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';

// Serializable adapter for Targets that change after mount; a persisted island never receives new props
export interface MapTargetSyncOptions {
	// Read from the document root as a space-separated list of feature ids
	attributeName: string;
	// Dispatched on `document` whenever the attribute or the map container's width may have changed
	eventName: string;
}

type Position = [longitude: number, latitude: number];

export function parseTargetIds(value: string): Array<string> {
	return value.split(/\s+/).filter((id) => id.length > 0);
}

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

export function getTargetCamera(positions: ReadonlyArray<Position>, zoom: number) {
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

	if (west === east && south === north) {
		return {
			center: first,
			type: 'center',
			zoom: zoom < targetZoomMin ? targetZoomDefault : Math.min(zoom, targetZoomMax),
		} as const;
	}

	const bounds: [Position, Position] = [
		[west, south],
		[east, north],
	];

	return { bounds, maxZoom: targetZoomMax, type: 'bounds' } as const;
}
