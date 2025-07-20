import type { Feature, FeatureCollection } from 'geojson';

import { useQuery } from '@tanstack/react-query';
import { geojson } from 'flatgeobuf';
import ky from 'ky';

import type { MapComponentProps } from '../../types';

export function useMapApiDivisionData({
	apiDivisionUrl,
	isDev,
}: Pick<MapComponentProps, 'apiDivisionUrl' | 'isDev'>) {
	return useQuery({
		queryKey: ['division-data', apiDivisionUrl],
		queryFn: async () => {
			if (!apiDivisionUrl) return false;

			try {
				// Fetch FlatGeobuf file
				const arrayBuffer = await ky
					.get(apiDivisionUrl, { timeout: isDev ? false : 10_000 })
					.arrayBuffer();

				// Convert ArrayBuffer to ReadableStream for FlatGeobuf
				const uint8Array = new Uint8Array(arrayBuffer);
				const stream = new ReadableStream({
					start(controller) {
						controller.enqueue(uint8Array);
						controller.close();
					},
				});

				// Deserialize FlatGeobuf to GeoJSON features
				const iter = geojson.deserialize(stream);
				const features: Array<Feature> = [];

				for await (const feature of iter) {
					features.push(feature as unknown as Feature);
				}

				return {
					type: 'FeatureCollection',
					features,
				} satisfies FeatureCollection;
			} catch (error) {
				console.error('Failed to process FlatGeobuf data:', error);
				return false;
			}
		},
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		enabled: !!apiDivisionUrl,
	});
}
