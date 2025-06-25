import { memo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { MapLayerIdEnum } from '../config/layer';
import { MapSourceIdEnum } from '../config/source';
import { useMapCanvasData } from './hooks/use-map-canvas-data';
import { useMapLayerStyles } from './hooks/use-map-layer-styles';

const MapLineStringLayerContent = memo(function MapLineStringLayerContent({
	data,
}: {
	data: MapSourceFeatureCollection;
}) {
	const mapLayerStyles = useMapLayerStyles();

	return (
		<Source id={MapSourceIdEnum.LineStringCollection} type="geojson" data={data} generateId={true}>
			<Layer key={MapLayerIdEnum.LineString} {...mapLayerStyles[MapLayerIdEnum.LineString]} />
		</Source>
	);
});

export const MapLineStringLayer = () => {
	const { lineStringCollection: data } = useMapCanvasData();

	return data ? <MapLineStringLayerContent data={data} /> : undefined;
};
