import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import { useQuery } from '@tanstack/react-query';
import { bboxPolygon, difference, featureCollection } from '@turf/turf';
import { geojson } from 'flatgeobuf';
import ky from 'ky';
import { GeometryTypeEnum } from 'packages/map-types/src';
import { isIncludedIn } from 'remeda';

import type { MapComponentProps } from '../../types';

// This inverts the polygon geometry to allow for styling of the area outside the polygon geometry
export function createFeatureMask(feature: Feature<Polygon | MultiPolygon>) {
	const worldMap = bboxPolygon([-180, -85, 180, 85]);

	return difference(featureCollection([worldMap, feature]));
}

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
				const featuresIterator = geojson.deserialize(stream);
				const features: Array<Feature<Polygon | MultiPolygon>> = [];

				for await (const feature of featuresIterator) {
					if (
						isIncludedIn(feature.geometry.type, [
							GeometryTypeEnum.MultiPolygon,
							GeometryTypeEnum.Polygon,
						])
					) {
						const invertedFeature = createFeatureMask(feature as Feature<Polygon | MultiPolygon>);

						if (invertedFeature) features.push(invertedFeature);
					}
				}

				return {
					type: 'FeatureCollection',
					features,
				} satisfies FeatureCollection<Polygon | MultiPolygon>;
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
