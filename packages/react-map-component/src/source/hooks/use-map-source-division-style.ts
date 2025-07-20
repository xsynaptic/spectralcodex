import type { FillLayerSpecification, LineLayerSpecification } from 'react-map-gl/maplibre';

import { useMemo } from 'react';

import { MapLayerIdEnum } from '../../config/layer';
import { MapSourceIdEnum } from '../../config/source';

export function useMapSourceDivisionStyle() {
	const divisionLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.Division,
				source: MapSourceIdEnum.DivisionCollection,
				type: 'fill',
				paint: {
					'fill-color': '#088',
					'fill-opacity': 0.1,
				},
			}) satisfies FillLayerSpecification,
		[],
	);

	const divisionOutlineLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.DivisionOutline,
				source: MapSourceIdEnum.DivisionCollection,
				type: 'line',
				paint: {
					'line-color': '#088',
					'line-width': 2,
					'line-opacity': 0.7,
				},
			}) satisfies LineLayerSpecification,
		[],
	);

	return {
		[MapLayerIdEnum.Division]: divisionLayerStyle,
		[MapLayerIdEnum.DivisionOutline]: divisionOutlineLayerStyle,
	};
}
