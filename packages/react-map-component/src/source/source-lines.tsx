import type { FC } from 'react';
import type { LineLayerSpecification } from 'react-map-gl/maplibre';

import { memo } from 'react';
import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { useDarkMode } from '../lib/dark-mode';
import { statusColorArray, statusColorDarkArray } from '../lib/location-status';
import { MapLayerIdEnum, MapSourceIdEnum } from './source-config';

function useMapSourceLinesStyle() {
	const isDarkMode = useDarkMode();

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
					'line-color': [
						'match',
						['string', ['get', 'status']],
						...(isDarkMode ? statusColorDarkArray : statusColorArray),
						'gray',
					],
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
		[isDarkMode],
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
