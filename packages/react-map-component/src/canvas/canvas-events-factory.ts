import { GeometryTypeEnum } from '@spectralcodex/shared/map';

import type { MapClickHit } from '#host/host-click-factory.ts';

import { getClusterHoverId } from '#lib/cluster-hover.ts';
import { MapLayerIdEnum } from '#source/source-config.ts';

export interface MapCanvasClickInput {
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
	storeHoveredIdUpdate: MapStoreHoveredIdUpdate | undefined;
}

type MapCoordinates = [number, number];

type MapCursor = '' | 'pointer' | 'zoom-in';

interface MapFeatureStateChange {
	featureId: number | string;
	hover: boolean;
}

interface MapStoreHoveredIdUpdate {
	hoveredId: string | undefined;
}

export function getCanvasClickHit(input: MapCanvasClickInput): MapClickHit {
	const { clusterId, coordinates, geometryType, layerId, pointId } = input;

	if (geometryType !== GeometryTypeEnum.Point) return { kind: 'empty' };

	switch (layerId) {
		case MapLayerIdEnum.Clusters: {
			const expansionClusterId = getClusterId(clusterId);

			if (expansionClusterId === undefined || !isMapCoordinates(coordinates)) {
				return { kind: 'empty' };
			}

			return { center: coordinates, clusterId: expansionClusterId, kind: 'cluster' };
		}
		case MapLayerIdEnum.Points:
		case MapLayerIdEnum.PointsImage:
		case MapLayerIdEnum.PointsTarget: {
			return typeof pointId === 'string'
				? { isPick: false, kind: 'point', pointId }
				: { kind: 'empty' };
		}
		default: {
			return { kind: 'empty' };
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
						? getStoreHoveredIdUpdate(storeHoveredId, getClusterHoverId(clusterId))
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
				cursor: '',
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
