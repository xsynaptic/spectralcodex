import type { CollectionEntry } from 'astro:content';
import type { MapGeometry } from 'packages/react-map-component/src';

import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationStatusEnum,
} from '@spectralcodex/map-types';
import { featureCollection } from '@turf/helpers';

import type { MapFeatureCollection, MapFeatureProperties } from '#lib/map/map-types.ts';

/**
 * Generate a feature collection for an image entry; used to generate map data for image pages
 */
export function getImageFeatureCollection(entry: CollectionEntry<'images'>) {
	return entry.data.geometry
		? (featureCollection<MapGeometry, MapFeatureProperties>([
				{
					type: 'Feature',
					geometry: {
						type: GeometryTypeEnum.Point,
						coordinates: entry.data.geometry.coordinates,
					},
					properties: {
						title: entry.data.title,
						description: entry.data.description,
						category: LocationCategoryEnum.Unknown,
						status: LocationStatusEnum.Unknown,
						precision: 5,
						rating: 1,
						quality: entry.data.entryQuality,
					},
				},
			]) satisfies MapFeatureCollection)
		: undefined;
}
