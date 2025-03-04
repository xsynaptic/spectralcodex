import { memo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { layerStyles } from '../config/layer-style';
import { MapSourceIdEnum } from '../config/source';
import { useMapCanvasData } from './hooks/use-map-canvas-data';

const MapLineStringLayerContent = memo(function MapLineStringLayerContent({
	data,
}: {
	data: MapSourceFeatureCollection;
}) {
	return (
		<Source id={MapSourceIdEnum.LineStringCollection} type="geojson" data={data} generateId={true}>
			<Layer key="line-string" {...layerStyles.lineString} />
		</Source>
	);
});

export const MapLineStringLayer = () => {
	const { lineStringCollection: data } = useMapCanvasData();

	return data ? <MapLineStringLayerContent data={data} /> : undefined;
};
