import { LocationStatusEnum } from '@spectralcodex/map-types';
import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { useMapCanvasData } from '../canvas/hooks/use-map-canvas-data';
import { MapLayerIdEnum } from '../config/layer';
import { MapSourceIdEnum } from '../config/source';
import { useMapCanvasInteractive } from '../store/hooks/use-map-store';
import { useMapSourcePointsStyle } from './hooks/use-map-source-points-style';

const MapPointLayerContent = memo(function MapPointLayerContents({
	data,
	interactive,
	hasMapIcons,
}: {
	data: MapSourceFeatureCollection;
	interactive: boolean;
	hasMapIcons: boolean;
}) {
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

	return (
		<Source
			id={MapSourceIdEnum.PointCollection}
			type="geojson"
			data={data}
			generateId={true}
			{...clusterConfig}
		>
			<Layer key={MapLayerIdEnum.Clusters} {...pointsStyle[MapLayerIdEnum.Clusters]} />
			<Layer key={MapLayerIdEnum.ClustersLabel} {...pointsStyle[MapLayerIdEnum.ClustersLabel]} />
			<Layer key={MapLayerIdEnum.PointsTarget} {...pointsStyle[MapLayerIdEnum.PointsTarget]} />
			<Layer key={MapLayerIdEnum.Points} {...pointsStyle[MapLayerIdEnum.Points]} />
			{hasMapIcons ? (
				<Layer key={MapLayerIdEnum.PointsImage} {...pointsStyle[MapLayerIdEnum.PointsImage]} />
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
