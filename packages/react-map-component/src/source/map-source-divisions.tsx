import type { FeatureCollection } from 'geojson';
import type { FC } from 'react';
import type { FillLayerSpecification, LineLayerSpecification } from 'react-map-gl/maplibre';

import { memo } from 'react';
import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import { mapDivisionStyle } from '../config/colors';
import { MapLayerIdEnum } from '../config/layer';
import { MapSourceIdEnum } from '../config/source';

// TODO: adjust style for dark mode
function useMapSourceDivisionStyle() {
	const divisionMaskLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.DivisionMask,
				source: MapSourceIdEnum.DivisionCollection,
				type: 'fill',
				paint: {
					'fill-color': mapDivisionStyle.fillColor,
					'fill-opacity': 0.16,
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
						0.8, // Width
						12,
						1,
						18,
						2,
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
		[],
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
