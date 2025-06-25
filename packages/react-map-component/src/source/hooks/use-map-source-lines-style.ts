import type { LineLayerSpecification } from 'react-map-gl/maplibre';

import { useMemo } from 'react';

import { MapLayerIdEnum } from '../../config/layer';
import { MapSourceIdEnum } from '../../config/source';
import { statusColorMap } from '../map-source-utils';

export function useMapSourceLinesStyle() {
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
