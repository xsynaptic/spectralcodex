import { GeometryTypeEnum } from '@spectralcodex/shared/map';

import { MapLayerIdEnum } from '#source/source-config.ts';

type MapCoordinates = [number, number];

type MapCursor = 'grab' | 'pointer' | 'zoom-in';

export interface MapClickInput {
	layerId: string | undefined;
	geometryType: string | undefined;
	coordinates: unknown;
	pointId: unknown;
	clusterId: unknown;
}

interface MapClearSelectionAction {
	kind: 'clear-selection';
}

interface MapCloseFilterAction {
	kind: 'close-filter';
}

interface MapExpandClusterAction {
	kind: 'expand-cluster';
	clusterId: string | number;
	center: MapCoordinates;
}

interface MapSelectPointAction {
	kind: 'select-point';
	pointId: string;
	center: MapCoordinates | undefined;
}

export type MapClickAction =
	MapClearSelectionAction | MapCloseFilterAction | MapExpandClusterAction | MapSelectPointAction;

export interface MapHoverInput {
	layerId: string | undefined;
	featureId: string | number | undefined;
	pointId: unknown;
	clusterId: unknown;
	hoveredFeatureId: string | number | undefined;
	storeHoveredId: string | undefined;
}

interface MapFeatureStateChange {
	featureId: string | number;
	hover: boolean;
}

interface MapStoreHoveredIdUpdate {
	hoveredId: string | undefined;
}

export interface MapHoverIntent {
	cursor: MapCursor;
	featureStateChanges: Array<MapFeatureStateChange>;
	hoveredFeatureId: string | number | undefined;
	// `undefined` means no store write
	storeHoveredIdUpdate: MapStoreHoveredIdUpdate | undefined;
}

function isMapCoordinates(input: unknown): input is MapCoordinates {
	return (
		!!input &&
		Array.isArray(input) &&
		input.length === 2 &&
		typeof input[0] === 'number' &&
		typeof input[1] === 'number'
	);
}

function getClusterId(input: unknown): string | number | undefined {
	if (typeof input !== 'string' && typeof input !== 'number') return undefined;
	if (!input) return undefined;

	return input;
}

export function decideClickActions(input: MapClickInput): Array<MapClickAction> {
	const { layerId, geometryType, coordinates, pointId, clusterId } = input;

	if (!layerId || geometryType !== GeometryTypeEnum.Point) return [{ kind: 'clear-selection' }];

	switch (layerId) {
		case MapLayerIdEnum.Clusters: {
			const expansionClusterId = getClusterId(clusterId);

			if (expansionClusterId === undefined || !isMapCoordinates(coordinates)) {
				return [{ kind: 'close-filter' }];
			}

			return [
				{ kind: 'close-filter' },
				{ kind: 'expand-cluster', clusterId: expansionClusterId, center: coordinates },
			];
		}
		case MapLayerIdEnum.Points:
		case MapLayerIdEnum.PointsTarget:
		case MapLayerIdEnum.PointsImage: {
			if (typeof pointId !== 'string') return [{ kind: 'close-filter' }];

			return [
				{ kind: 'close-filter' },
				{
					kind: 'select-point',
					pointId,
					center: isMapCoordinates(coordinates) ? coordinates : undefined,
				},
			];
		}
		default: {
			return [{ kind: 'close-filter' }];
		}
	}
}

function getFeatureStateChanges(
	previousId: string | number | undefined,
	nextId: string | number | undefined,
): Array<MapFeatureStateChange> {
	if (previousId === nextId) return [];

	const changes: Array<MapFeatureStateChange> = [];

	if (previousId !== undefined) changes.push({ featureId: previousId, hover: false });
	if (nextId !== undefined) changes.push({ featureId: nextId, hover: true });

	return changes;
}

function getStoreHoveredIdUpdate(
	storeHoveredId: string | undefined,
	nextHoveredId: string | undefined,
): MapStoreHoveredIdUpdate | undefined {
	if (nextHoveredId === storeHoveredId) return undefined;

	return { hoveredId: nextHoveredId };
}

export function decideHoverIntent(input: MapHoverInput): MapHoverIntent {
	const { layerId, featureId, pointId, clusterId, hoveredFeatureId, storeHoveredId } = input;

	switch (layerId) {
		case MapLayerIdEnum.Clusters: {
			return {
				cursor: 'zoom-in',
				featureStateChanges: getFeatureStateChanges(hoveredFeatureId, featureId),
				hoveredFeatureId: featureId,
				storeHoveredIdUpdate:
					typeof clusterId === 'number'
						? getStoreHoveredIdUpdate(storeHoveredId, `cluster-${String(clusterId)}`)
						: undefined,
			};
		}
		case MapLayerIdEnum.Points:
		case MapLayerIdEnum.PointsTarget:
		case MapLayerIdEnum.PointsImage: {
			return {
				cursor: 'pointer',
				featureStateChanges: getFeatureStateChanges(hoveredFeatureId, featureId),
				hoveredFeatureId: featureId,
				storeHoveredIdUpdate:
					typeof pointId === 'string'
						? getStoreHoveredIdUpdate(storeHoveredId, pointId)
						: undefined,
			};
		}
		default: {
			return {
				cursor: 'grab',
				featureStateChanges: getFeatureStateChanges(hoveredFeatureId, undefined),
				hoveredFeatureId: undefined,
				storeHoveredIdUpdate: getStoreHoveredIdUpdate(storeHoveredId, undefined),
			};
		}
	}
}
