import type { FeatureCollection } from 'geojson';
import type { FC } from 'react';
import type { LineLayerSpecification } from 'react-map-gl/maplibre';

import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapComponentProps } from '#types.ts';

import { tailwindColors } from '#lib/tailwind-colors.ts';

export const MapSourceDebug: FC<{ bounds: MapComponentProps['bounds'] }> = function MapSourceDebug({
	bounds,
}) {
	const debugData = useMemo(() => {
		if (!bounds) return;

		const [west, south, east, north] = bounds as [number, number, number, number];

		return {
			features: [
				{
					geometry: {
						coordinates: [
							[
								[west, south],
								[east, south],
								[east, north],
								[west, north],
								[west, south], // Close the polygon
							],
						],
						type: 'Polygon',
					},
					properties: {},
					type: 'Feature',
				},
			],
			type: 'FeatureCollection',
		} satisfies FeatureCollection;
	}, [bounds]);

	const debugLayerStyle = useMemo(
		() =>
			({
				id: 'debug',
				paint: {
					'line-color': tailwindColors.red400,
					'line-opacity': 0.7,
					'line-width': 1,
				},
				source: 'debug',
				type: 'line',
			}) satisfies LineLayerSpecification,
		[],
	);

	if (!debugData) return;

	return (
		<Source data={debugData} id={'debug'} type="geojson">
			<Layer {...debugLayerStyle} />
		</Source>
	);
};
