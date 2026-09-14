import { GeometryTypeEnum } from '@spectralcodex/shared/map';

import { MapLayerIdEnum } from '#source/source-config.ts';

export type MapClickAction =
	MapClearSelectionAction | MapCloseFilterAction | MapExpandClusterAction | MapSelectPointAction;

export interface MapClickInput {
	clusterId: unknown;
	coordinates: unknown;
	geometryType: string | undefined;
	layerId: string | undefined;
	pointId: unknown;
}

export interface MapHoverInput {
	clusterId: unknown;
	featureId: number | string | undefined;
	hoveredFeatureId: number | string | undefined;
	layerId: string | undefined;
	pointId: unknown;
	storeHoveredId: string | undefined;
}

export interface MapHoverIntent {
	cursor: MapCursor;
	featureStateChanges: Array<MapFeatureStateChange>;
	hoveredFeatureId: number | string | undefined;
	// `undefined` means no store write
	storeHoveredIdUpdate: MapStoreHoveredIdUpdate | undefined;
}

interface MapClearSelectionAction {
	kind: 'clear-selection';
}

interface MapCloseFilterAction {
	kind: 'close-filter';
}

type MapCoordinates = [number, number];

type MapCursor = 'grab' | 'pointer' | 'zoom-in';

interface MapExpandClusterAction {
	center: MapCoordinates;
	clusterId: number | string;
	kind: 'expand-cluster';
}

interface MapFeatureStateChange {
	featureId: number | string;
	hover: boolean;
}

interface MapSelectPointAction {
	center: MapCoordinates | undefined;
	kind: 'select-point';
	pointId: string;
}

interface MapStoreHoveredIdUpdate {
	hoveredId: string | undefined;
}

export function decideClickActions(input: MapClickInput): Array<MapClickAction> {
	const { clusterId, coordinates, geometryType, layerId, pointId } = input;

	if (!layerId || geometryType !== GeometryTypeEnum.Point) return [{ kind: 'clear-selection' }];

	switch (layerId) {
		case MapLayerIdEnum.Clusters: {
			const expansionClusterId = getClusterId(clusterId);

			if (expansionClusterId === undefined || !isMapCoordinates(coordinates)) {
				return [{ kind: 'close-filter' }];
			}

			return [
				{ kind: 'close-filter' },
				{ center: coordinates, clusterId: expansionClusterId, kind: 'expand-cluster' },
			];
		}
		case MapLayerIdEnum.Points:
		case MapLayerIdEnum.PointsImage:
		case MapLayerIdEnum.PointsTarget: {
			if (typeof pointId !== 'string') return [{ kind: 'close-filter' }];

			return [
				{ kind: 'close-filter' },
				{
					center: isMapCoordinates(coordinates) ? coordinates : undefined,
					kind: 'select-point',
					pointId,
				},
			];
		}
		default: {
			return [{ kind: 'close-filter' }];
		}
	}
}

export function decideHoverIntent(input: MapHoverInput): MapHoverIntent {
	const { clusterId, featureId, hoveredFeatureId, layerId, pointId, storeHoveredId } = input;

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
		case MapLayerIdEnum.PointsImage:
		case MapLayerIdEnum.PointsTarget: {
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

function getClusterId(input: unknown): number | string | undefined {
	if (typeof input !== 'string' && typeof input !== 'number') return undefined;
	if (!input) return undefined;

	return input;
}

function getFeatureStateChanges(
	previousId: number | string | undefined,
	nextId: number | string | undefined,
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

function isMapCoordinates(input: unknown): input is MapCoordinates {
	return (
		!!input &&
		Array.isArray(input) &&
		input.length === 2 &&
		typeof input[0] === 'number' &&
		typeof input[1] === 'number'
	);
}
