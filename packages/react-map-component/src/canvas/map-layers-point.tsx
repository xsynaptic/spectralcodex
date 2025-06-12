import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { MapLayerIdEnum } from '../config/layer';
import { layerStyles } from '../config/layer-style';
import { MapSourceIdEnum } from '../config/source';
import { useMapCanvasInteractive } from '../store/hooks/use-map-store';
import { useMapCanvasData } from './hooks/use-map-canvas-data';

const MapPointLayerContent = memo(function MapPointLayerContents({
	data,
	interactive,
	hasMapIcons,
}: {
	data: MapSourceFeatureCollection;
	interactive: boolean;
	hasMapIcons: boolean;
}) {
	// TODO: investigate `clusterProperties` for displaying status types in clusters
	const clusterConfig = useMemo(
		() => ({
			cluster: interactive,
			clusterRadius: 14, // How much space to provide for clusters; lower number = higher density
			clusterMaxZoom: 14, // Max zoom to cluster points on
			clusterMinPoints: 2, // Minimum number of points to cluster
		}),
		[interactive],
	);

	return (
		<Source
			id={MapSourceIdEnum.PointCollection}
			type="geojson"
			data={data}
			generateId={true}
			{...clusterConfig}
		>
			<Layer key={MapLayerIdEnum.Clusters} {...layerStyles[MapLayerIdEnum.Clusters]} />
			<Layer key={MapLayerIdEnum.ClustersLabel} {...layerStyles[MapLayerIdEnum.ClustersLabel]} />
			<Layer key={MapLayerIdEnum.PointsTarget} {...layerStyles[MapLayerIdEnum.PointsTarget]} />
			<Layer key={MapLayerIdEnum.Points} {...layerStyles[MapLayerIdEnum.Points]} />
			{hasMapIcons ? (
				<Layer key={MapLayerIdEnum.PointsIcon} {...layerStyles[MapLayerIdEnum.PointsIcon]} />
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
