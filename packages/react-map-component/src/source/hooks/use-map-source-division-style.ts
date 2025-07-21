import type { FillLayerSpecification, LineLayerSpecification } from 'react-map-gl/maplibre';

import { mapDivisionStyle } from 'packages/react-map-component/src/config/colors';
import { useMemo } from 'react';

import { MapLayerIdEnum } from '../../config/layer';
import { MapSourceIdEnum } from '../../config/source';

export function useMapSourceDivisionStyle() {
	const divisionMaskLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.DivisionMask,
				source: MapSourceIdEnum.DivisionCollection,
				type: 'fill',
				paint: {
					'fill-color': mapDivisionStyle.fillColor,
					'fill-opacity': 0.2,
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
				layout: {
					'line-cap': 'round',
					'line-join': 'round',
				},
				paint: {
					'line-color': mapDivisionStyle.outlineColor,
					'line-width': [
						'interpolate',
						['linear'],
						['zoom'],
						0, // Zoom level
						1, // Width
						12,
						2,
						18,
						3,
					],
					'line-opacity': 0.7,
				},
			}) satisfies LineLayerSpecification,
		[],
	);

	const divisionHaloLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.DivisionHalo,
				source: MapSourceIdEnum.DivisionCollection,
				type: 'line',
				layout: {
					'line-cap': 'round',
					'line-join': 'round',
				},
				paint: {
					'line-blur': 5,
					'line-color': mapDivisionStyle.haloColor,
					'line-width': [
						'interpolate',
						['linear'],
						['zoom'],
						0, // Zoom level
						2, // Width
						12,
						3,
						18,
						5,
					],
					'line-opacity': 0.2,
				},
			}) satisfies LineLayerSpecification,
		[],
	);

	return {
		[MapLayerIdEnum.DivisionMask]: divisionMaskLayerStyle,
		[MapLayerIdEnum.DivisionOutline]: divisionOutlineLayerStyle,
		[MapLayerIdEnum.DivisionHalo]: divisionHaloLayerStyle,
	};
}
