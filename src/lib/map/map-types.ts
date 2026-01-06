import type { MapGeometry } from '@spectralcodex/react-map-component';
import type { FeatureCollection } from 'geojson';

import { LocationCategoryEnum, LocationStatusEnum } from '@spectralcodex/map-types';
import { z } from 'zod';

import { ImageThumbnailSchema } from '#lib/schemas/index.ts';
import { UrlSchema } from '#lib/schemas/index.ts';
import { NumericScaleSchema } from '#lib/schemas/index.ts';

// This is used to form map API endpoint URLs
export const MapApiDataEnum = {
	Source: 's.json',
	Popup: 'p.json',
} as const;

export const MapFeaturePropertiesSchema = z.object({
	title: z.string(),
	titleMultilingualLang: z.string().optional(),
	titleMultilingualValue: z.string().optional(),
	url: z.string().optional(),
	description: z.string().optional(),
	category: z.enum(LocationCategoryEnum),
	status: z.enum(LocationStatusEnum),
	precision: NumericScaleSchema,
	quality: NumericScaleSchema,
	rating: NumericScaleSchema,
	safety: NumericScaleSchema.optional(),
	objective: NumericScaleSchema.optional(),
	outlier: z.boolean().optional(),
	googleMapsUrl: UrlSchema.optional(),
	wikipediaUrl: UrlSchema.optional(),
	image: ImageThumbnailSchema.optional(),
});

export type MapFeatureProperties = z.output<typeof MapFeaturePropertiesSchema>;

export type MapFeatureCollection = FeatureCollection<MapGeometry, MapFeatureProperties>;
