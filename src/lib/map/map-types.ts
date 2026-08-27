import type { MapGeometry } from '@spectralcodex/react-map-component';
import type { FeatureCollection } from 'geojson';

import { LocationCategoryEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { z } from 'zod';

import { ImageThumbnailSchema } from '#lib/schemas/index.ts';
import { NumericScaleSchema } from '#lib/schemas/index.ts';

// Route params for `/api/map/[...id].json`
export const MapApiDataEnum = {
	Source: 's',
	Popup: 'p',
} as const;

// Reserved for future runtime validation of map API payloads
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Needed for type generation
const MapFeaturePropertiesSchema = z.object({
	title: z.string(),
	titleMultilingualLang: z.string().optional(),
	titleMultilingualValue: z.string().optional(),
	url: z.string().optional(),
	description: z.string().optional(),
	category: z.enum(LocationCategoryEnum),
	status: z.enum(LocationStatusEnum),
	precision: NumericScaleSchema,
	entryQuality: NumericScaleSchema,
	rating: NumericScaleSchema,
	safety: NumericScaleSchema.optional(),
	objective: NumericScaleSchema.optional(),
	outlier: z.boolean().optional(),
	googleMapsUrl: z.url().optional(),
	wikipediaUrl: z.url().optional(),
	image: ImageThumbnailSchema.optional(),
});

export type MapFeatureProperties = z.output<typeof MapFeaturePropertiesSchema>;

export type MapFeatureCollection = FeatureCollection<MapGeometry, MapFeatureProperties>;
