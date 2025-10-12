import type { FeatureCollection } from 'geojson';
import type { FC } from 'react';
import type { FillLayerSpecification, LineLayerSpecification } from 'react-map-gl/maplibre';

import { memo } from 'react';
import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import { useDarkMode } from '../lib/dark-mode';
import { tailwindColors } from '../lib/tailwind-colors';
import { MapLayerIdEnum, MapSourceIdEnum } from './source-config';

function useMapSourceDivisionStyle() {
	const isDarkMode = useDarkMode();

	const divisionMaskLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.DivisionMask,
				source: MapSourceIdEnum.DivisionCollection,
				type: 'fill',
				paint: {
					'fill-color': isDarkMode ? tailwindColors.zinc500 : tailwindColors.stone400,
					'fill-opacity': isDarkMode ? 0.09 : 0.15,
				},
			}) satisfies FillLayerSpecification,
		[isDarkMode],
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
					'line-color': isDarkMode ? tailwindColors.red500 : tailwindColors.red400,
					'line-width': [
						'interpolate',
						['linear'],
						['zoom'],
						0, // Zoom level
						0.8, // Width
						12,
						1,
						18,
						2,
					],
					'line-opacity': 0.7,
				},
			}) satisfies LineLayerSpecification,
		[isDarkMode],
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
					'line-color': isDarkMode ? tailwindColors.red600 : tailwindColors.red500,
					'line-width': [
						'interpolate',
						['linear'],
						['zoom'],
						0, // Zoom level
						1,
						8,
						2, // Width
						12,
						3,
						18,
						4,
					],
					'line-opacity': 0.2,
				},
			}) satisfies LineLayerSpecification,
		[isDarkMode],
	);

	return {
		[MapLayerIdEnum.DivisionMask]: divisionMaskLayerStyle,
		[MapLayerIdEnum.DivisionOutline]: divisionOutlineLayerStyle,
		[MapLayerIdEnum.DivisionHalo]: divisionHaloLayerStyle,
	};
}

export const MapSourceDivisions: FC<{ data: FeatureCollection }> = memo(
	function MapDivisionSourceLayers({ data }) {
		const divisionStyle = useMapSourceDivisionStyle();

		return (
			<Source id={MapSourceIdEnum.DivisionCollection} type="geojson" data={data} generateId={true}>
				<Layer key={MapLayerIdEnum.DivisionMask} {...divisionStyle[MapLayerIdEnum.DivisionMask]} />
				<Layer key={MapLayerIdEnum.DivisionHalo} {...divisionStyle[MapLayerIdEnum.DivisionHalo]} />
				<Layer
					key={MapLayerIdEnum.DivisionOutline}
					{...divisionStyle[MapLayerIdEnum.DivisionOutline]}
				/>
			</Source>
		);
	},
);
