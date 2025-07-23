import type { FeatureCollection } from 'geojson';
import type { MapComponentProps } from 'packages/react-map-component/src/types';
import type { FC } from 'react';
import type { LineLayerSpecification } from 'react-map-gl/maplibre';

import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

export const MapSourceDebug: FC<{ bounds: MapComponentProps['bounds'] }> = function MapSourceDebug({
	bounds,
}) {
	const debugData = useMemo(() => {
		if (!bounds) return;

		const [west, south, east, north] = bounds as [number, number, number, number];

		return {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'Polygon',
						coordinates: [
							[
								[west, south],
								[east, south],
								[east, north],
								[west, north],
								[west, south], // Close the polygon
							],
						],
					},
				},
			],
		} satisfies FeatureCollection;
	}, [bounds]);

	const debugLayerStyle = useMemo(
		() =>
			({
				id: 'debug',
				source: 'debug',
				type: 'line',
				paint: {
					'line-color': '#ff0000',
					'line-width': 1,
					'line-opacity': 0.7,
				},
			}) satisfies LineLayerSpecification,
		[],
	);

	if (!debugData) return;

	return (
		<Source id={'debug'} type="geojson" data={debugData}>
			<Layer {...debugLayerStyle} />
		</Source>
	);
};
