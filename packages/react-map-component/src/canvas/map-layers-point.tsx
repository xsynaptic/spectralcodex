import { LocationStatusEnum } from '@spectralcodex/map-types';
import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { MapLayerIdEnum } from '../config/layer';
import { MapSourceIdEnum } from '../config/source';
import { useMapCanvasInteractive } from '../store/hooks/use-map-store';
import { useMapCanvasData } from './hooks/use-map-canvas-data';
import { useMapLayerStyles } from './hooks/use-map-layer-styles';

const MapPointLayerContent = memo(function MapPointLayerContents({
	data,
	interactive,
	hasMapIcons,
}: {
	data: MapSourceFeatureCollection;
	interactive: boolean;
	hasMapIcons: boolean;
}) {
	const mapLayerStyles = useMapLayerStyles();

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

	return (
		<Source
			id={MapSourceIdEnum.PointCollection}
			type="geojson"
			data={data}
			generateId={true}
			{...clusterConfig}
		>
			<Layer key={MapLayerIdEnum.Clusters} {...mapLayerStyles[MapLayerIdEnum.Clusters]} />
			<Layer key={MapLayerIdEnum.ClustersLabel} {...mapLayerStyles[MapLayerIdEnum.ClustersLabel]} />
			<Layer key={MapLayerIdEnum.PointsTarget} {...mapLayerStyles[MapLayerIdEnum.PointsTarget]} />
			<Layer key={MapLayerIdEnum.Points} {...mapLayerStyles[MapLayerIdEnum.Points]} />
			{hasMapIcons ? (
				<Layer key={MapLayerIdEnum.PointsIcon} {...mapLayerStyles[MapLayerIdEnum.PointsIcon]} />
			) : undefined}
		</Source>
	);
});

export const MapPointLayer = ({ hasMapIcons }: { hasMapIcons: boolean }) => {
	const interactive = useMapCanvasInteractive();
	const { pointCollection: data } = useMapCanvasData();

	return data ? (
		<MapPointLayerContent data={data} interactive={interactive} hasMapIcons={hasMapIcons} />
	) : undefined;
};
