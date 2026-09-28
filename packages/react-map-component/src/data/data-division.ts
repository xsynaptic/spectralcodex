import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { useQuery } from '@tanstack/react-query';
import { bboxPolygon } from '@turf/bbox-polygon';
import { difference } from '@turf/difference';
import { featureCollection } from '@turf/helpers';
import { geojson } from 'flatgeobuf';
import * as R from 'remeda';

import type { MapComponentProps } from '#types.ts';

import { fetchTimeoutMs } from '#constants.ts';

export function useMapApiDivisionData({
	apiDivisionUrl,
	isDev,
}: Pick<MapComponentProps, 'apiDivisionUrl' | 'isDev'>) {
	// Errors must propagate so React Query retries instead of caching a permanent empty result
	return useQuery<FeatureCollection<MultiPolygon | Polygon>>({
		enabled: !!apiDivisionUrl,
		queryFn: async () => {
			if (!apiDivisionUrl) throw new Error('[Map] Division data query enabled without a URL');

			// Fetch FlatGeobuf file
			const response = await fetch(
				apiDivisionUrl,
				isDev ? {} : { signal: AbortSignal.timeout(fetchTimeoutMs) },
			);
			if (!response.ok) throw new Error(`[Map] Fetch failed: ${String(response.status)}`);
			const arrayBuffer = await response.arrayBuffer();

			// Deserialize FlatGeobuf to GeoJSON features
			const featuresIterator = geojson.deserialize(new Uint8Array(arrayBuffer));
			const features: Array<Feature<MultiPolygon | Polygon>> = [];

			for await (const feature of featuresIterator) {
				if (
					!R.isIncludedIn(feature.geometry.type, [
						GeometryTypeEnum.MultiPolygon,
						GeometryTypeEnum.Polygon,
					])
				) {
					continue;
				}

				const invertedFeature = createFeatureMask(feature as Feature<MultiPolygon | Polygon>);

				if (invertedFeature) features.push(invertedFeature);
			}

			return {
				features,
				type: 'FeatureCollection',
			} satisfies FeatureCollection<MultiPolygon | Polygon>;
		},
		queryKey: ['division-data', apiDivisionUrl, isDev],
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	});
}

// This inverts the polygon geometry to allow for styling of the area outside the polygon geometry
function createFeatureMask(feature: Feature<MultiPolygon | Polygon>) {
	const worldMap = bboxPolygon([-180, -85, 180, 85]);

	return difference(featureCollection([worldMap, feature]));
}
