import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { layerStyles } from '../config/layer-style';
import { MapSourceIdEnum } from '../config/source';
import { useMapCanvasInteractive } from '../store/hooks/use-map-store';
import { useMapCanvasData } from './hooks/use-map-canvas-data';

const MapMultiPointLayerContent = memo(function MapMultiPointLayerContents({
	data,
	interactive,
}: {
	data: MapSourceFeatureCollection;
	interactive: boolean;
}) {
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
			id={MapSourceIdEnum.MultiPointCollection}
			type="geojson"
			data={data}
			generateId={true}
			{...clusterConfig}
		>
			<Layer key="cluster-circle" {...layerStyles.clusterCircle} />
			<Layer key="cluster-symbol" {...layerStyles.clusterSymbol} />
			<Layer key="points-target" {...layerStyles.multiPointsTarget} />
			<Layer key="points" {...layerStyles.multiPoints} />
		</Source>
	);
});

export const MapMultiPointLayer = () => {
	const interactive = useMapCanvasInteractive();
	const { multiPointCollection: data } = useMapCanvasData();

	return data ? <MapMultiPointLayerContent data={data} interactive={interactive} /> : undefined;
};
