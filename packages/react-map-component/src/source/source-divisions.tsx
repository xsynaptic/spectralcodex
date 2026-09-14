import type { FeatureCollection } from 'geojson';
import type { FC } from 'react';
import type { FillLayerSpecification, LineLayerSpecification } from 'react-map-gl/maplibre';

import { memo } from 'react';
import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import { useIsDarkMode } from '#lib/dark-mode.tsx';
import { tailwindColors } from '#lib/tailwind-colors.ts';
import { MapLayerIdEnum, MapSourceIdEnum } from '#source/source-config.ts';

function useMapSourceDivisionStyle() {
	const isDarkMode = useIsDarkMode();

	const divisionMaskLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.DivisionMask,
				paint: {
					'fill-color': isDarkMode ? tailwindColors.zinc500 : tailwindColors.stone400,
					'fill-opacity': isDarkMode ? 0.09 : 0.15,
				},
				source: MapSourceIdEnum.DivisionCollection,
				type: 'fill',
			}) satisfies FillLayerSpecification,
		[isDarkMode],
	);

	const divisionOutlineLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.DivisionOutline,
				layout: {
					'line-cap': 'round',
					'line-join': 'round',
				},
				paint: {
					'line-color': isDarkMode ? tailwindColors.red500 : tailwindColors.red400,
					'line-opacity': 0.7,
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
				},
				source: MapSourceIdEnum.DivisionCollection,
				type: 'line',
			}) satisfies LineLayerSpecification,
		[isDarkMode],
	);

	const divisionHaloLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.DivisionHalo,
				layout: {
					'line-cap': 'round',
					'line-join': 'round',
				},
				paint: {
					'line-blur': 5,
					'line-color': isDarkMode ? tailwindColors.red600 : tailwindColors.red500,
					'line-opacity': 0.2,
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
				},
				source: MapSourceIdEnum.DivisionCollection,
				type: 'line',
			}) satisfies LineLayerSpecification,
		[isDarkMode],
	);

	return {
		[MapLayerIdEnum.DivisionHalo]: divisionHaloLayerStyle,
		[MapLayerIdEnum.DivisionMask]: divisionMaskLayerStyle,
		[MapLayerIdEnum.DivisionOutline]: divisionOutlineLayerStyle,
	};
}

export const MapSourceDivisions: FC<{ data: FeatureCollection }> = memo(
	function MapDivisionSourceLayers({ data }) {
		const divisionStyle = useMapSourceDivisionStyle();

		return (
			<Source data={data} generateId={true} id={MapSourceIdEnum.DivisionCollection} type="geojson">
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
