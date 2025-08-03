import type { FC } from 'react';

import { LocationStatusEnum } from '@spectralcodex/map-types';
import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { MapLayerIdEnum } from '../config/layer';
import { MapSourceIdEnum } from '../config/source';
import { useMapSourcePointsStyle } from './hooks/use-map-source-points-style';

export const MapSourcePoints: FC<{
	data: MapSourceFeatureCollection;
	interactive: boolean;
	hasMapIcons: boolean;
}> = memo(function MapPointLayerContents({ data, interactive, hasMapIcons }) {
	const pointsStyle = useMapSourcePointsStyle();

	const clusterConfig = useMemo(() => {
		// Create cluster properties dynamically for each status
		const clusterProperties = Object.fromEntries(
			Object.values(LocationStatusEnum).map((status) => [
				status,
				['+', ['case', ['==', ['get', 'status'], status], 1, 0]],
			]),
		);

		return {
			cluster: interactive,
			clusterRadius: 14, // How much space to provide for clusters; lower number = higher density
			clusterMaxZoom: 14, // Max zoom to cluster points on
			clusterMinPoints: 2, // Minimum number of points to cluster
			clusterProperties,
		};
	}, [interactive]);

	// Note: Layer components need to be immediate children of Source components; do not use React.Fragment here
	return (
		<Source
			id={MapSourceIdEnum.PointCollection}
			type="geojson"
			data={data}
			generateId={true}
			{...clusterConfig}
		>
			{interactive ? (
				<Layer key={MapLayerIdEnum.Clusters} {...pointsStyle[MapLayerIdEnum.Clusters]} />
			) : undefined}
			{interactive ? (
				<Layer key={MapLayerIdEnum.ClustersLabel} {...pointsStyle[MapLayerIdEnum.ClustersLabel]} />
			) : undefined}
			<Layer key={MapLayerIdEnum.PointsTarget} {...pointsStyle[MapLayerIdEnum.PointsTarget]} />
			<Layer key={MapLayerIdEnum.Points} {...pointsStyle[MapLayerIdEnum.Points]} />
			<Layer key={MapLayerIdEnum.PointsLabel} {...pointsStyle[MapLayerIdEnum.PointsLabel]} />
			{hasMapIcons ? (
				<Layer key={MapLayerIdEnum.PointsImage} {...pointsStyle[MapLayerIdEnum.PointsImage]} />
			) : undefined}
		</Source>
	);
});
