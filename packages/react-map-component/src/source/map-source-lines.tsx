import type { FC } from 'react';

import { memo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { MapLayerIdEnum } from '../config/layer';
import { MapSourceIdEnum } from '../config/source';
import { useMapSourceLinesStyle } from './hooks/use-map-source-lines-style';

export const MapSourceLines: FC<{
	data: MapSourceFeatureCollection;
}> = memo(function MapLineStringLayerContent({ data }: { data: MapSourceFeatureCollection }) {
	const linesStyle = useMapSourceLinesStyle();

	return (
		<Source id={MapSourceIdEnum.LineStringCollection} type="geojson" data={data} generateId={true}>
			<Layer key={MapLayerIdEnum.LineString} {...linesStyle[MapLayerIdEnum.LineString]} />
		</Source>
	);
});
