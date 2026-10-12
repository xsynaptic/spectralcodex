import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { bboxPolygon } from '@turf/bbox-polygon';
import { difference } from '@turf/difference';
import { featureCollection } from '@turf/helpers';
import { deserialize } from 'flatgeobuf/geojson';
import * as R from 'remeda';

export const worldBounds = [-180, -85, 180, 85] satisfies [number, number, number, number];

// The mask is the world minus the feature, so the area outside it can be shaded
export function createFeatureMask(feature: Feature<MultiPolygon | Polygon>) {
	return difference(featureCollection([bboxPolygon(worldBounds), feature]));
}

export async function deserializeDivisionMasks(buffer: ArrayBuffer) {
	const featuresIterator = deserialize(new Uint8Array(buffer));
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
}
