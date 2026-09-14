import type { MapGeometry } from '@spectralcodex/react-map-component';
import type { FeatureCollection } from 'geojson';

import { LocationCategoryEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { z } from 'zod';

import { ImageThumbnailSchema } from '#lib/schemas/index.ts';
import { NumericScaleSchema } from '#lib/schemas/index.ts';

// Route params for `/api/map/[...id].json`
export const MapApiDataEnum = {
	Popup: 'p',
	Source: 's',
} as const;

// Reserved for future runtime validation of map API payloads
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Needed for type generation
const MapFeaturePropertiesSchema = z.object({
	category: z.enum(LocationCategoryEnum),
	description: z.string().optional(),
	entryQuality: NumericScaleSchema,
	googleMapsUrl: z.url().optional(),
	image: ImageThumbnailSchema.optional(),
	objective: NumericScaleSchema.optional(),
	outlier: z.boolean().optional(),
	precision: NumericScaleSchema,
	rating: NumericScaleSchema,
	safety: NumericScaleSchema.optional(),
	status: z.enum(LocationStatusEnum),
	title: z.string(),
	titleMultilingualLang: z.string().optional(),
	titleMultilingualValue: z.string().optional(),
	url: z.string().optional(),
	wikipediaUrl: z.url().optional(),
});

export type MapFeatureCollection = FeatureCollection<MapGeometry, MapFeatureProperties>;

export type MapFeatureProperties = z.output<typeof MapFeaturePropertiesSchema>;
