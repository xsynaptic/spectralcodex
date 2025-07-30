import type { MapComponentProps, MapGeometry } from '@spectralcodex/react-map-component';
import type { FeatureCollection } from 'geojson';

import { LocationCategoryEnum, LocationStatusEnum } from '@spectralcodex/map-types';
import { z } from 'astro:content';

import { ImageThumbnailSchema } from '#lib/schemas/image.ts';
import { NumericScaleSchema } from '#lib/schemas/index.ts';

// This is used to form map API endpoint URLs
export const MapApiDataEnum = {
	Source: 's',
	Popup: 'p',
} as const;

export const MapFeaturePropertiesSchema = z.object({
	title: z.string(),
	titleMultilingualLang: z.string().optional(),
	titleMultilingualValue: z.string().optional(),
	url: z.string().optional(),
	description: z.string().optional(),
	category: z.nativeEnum(LocationCategoryEnum),
	status: z.nativeEnum(LocationStatusEnum),
	precision: NumericScaleSchema,
	quality: NumericScaleSchema,
	rating: NumericScaleSchema,
	safety: NumericScaleSchema.optional(),
	objective: NumericScaleSchema.optional(),
	outlier: z.boolean().optional(),
	googleMapsUrl: z.string().url().optional(),
	wikipediaUrl: z.string().url().optional(),
	image: ImageThumbnailSchema.optional(),
});

type MapFeatureProperties = z.output<typeof MapFeaturePropertiesSchema>;

export type MapFeatureCollection = FeatureCollection<MapGeometry, MapFeatureProperties>;

export interface MapComponentData extends MapComponentProps {
	hasGeodata: boolean;
	featureCount: number;
	prefetchUrls?: Array<string> | undefined;
}
