import { memo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { useMapCanvasData } from '../canvas/hooks/use-map-canvas-data';
import { MapLayerIdEnum } from '../config/layer';
import { MapSourceIdEnum } from '../config/source';
import { useMapSourceLinesStyle } from './hooks/use-map-source-lines-style';

const MapLineStringLayerContent = memo(function MapLineStringLayerContent({
	data,
}: {
	data: MapSourceFeatureCollection;
}) {
	const linesStyle = useMapSourceLinesStyle();

	return (
		<Source id={MapSourceIdEnum.LineStringCollection} type="geojson" data={data} generateId={true}>
			<Layer key={MapLayerIdEnum.LineString} {...linesStyle[MapLayerIdEnum.LineString]} />
		</Source>
	);
});

export const MapLineStringLayer = () => {
	const { lineStringCollection: data } = useMapCanvasData();

	return data ? <MapLineStringLayerContent data={data} /> : undefined;
};
