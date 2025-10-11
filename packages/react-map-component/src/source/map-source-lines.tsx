import type { FC } from 'react';
import type { LineLayerSpecification } from 'react-map-gl/maplibre';

import { memo } from 'react';
import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { MapLayerIdEnum } from '../config/layer';
import { MapSourceIdEnum } from '../config/source';
import { statusColorMap } from './map-source-utils';

function useMapSourceLinesStyle() {
	// Experimental line drawing style
	const lineStringLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.LineString,
				source: MapSourceIdEnum.LineStringCollection,
				type: 'line',
				layout: {
					'line-join': 'round',
					'line-cap': 'round',
				},
				paint: {
					...(statusColorMap
						? {
								'line-color': ['match', ['string', ['get', 'status']], ...statusColorMap, 'gray'],
							}
						: {}),
					'line-width': [
						'interpolate',
						['linear'],
						['zoom'],
						0, // Zoom level
						2, // Radius
						8,
						3,
						12,
						5,
						15,
						8,
						18,
						10,
					],
				},
			}) satisfies LineLayerSpecification,
		[],
	);

	return {
		[MapLayerIdEnum.LineString]: lineStringLayerStyle,
	};
}

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
