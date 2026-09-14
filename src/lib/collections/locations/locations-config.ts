import { LocationCategoryEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import {
	LocationsNearbyItemSchema,
	LocationTwHeritageSchema,
} from '#lib/collections/locations/locations-schemas.ts';
import { createMultilingualSchemas, titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { GeometryPointsSchema } from '#lib/schemas/geometry.ts';
import { ImageThumbnailSchema } from '#lib/schemas/index.ts';
import {
	DateRecordedSchema,
	DateSchema,
	NumericScaleSchema,
	TitleSchema,
} from '#lib/schemas/index.ts';
import { LinkSchema, SourceSchema } from '#lib/schemas/resources.ts';

export const locations = defineCollection({
	loader: createEntryGlobLoader('locations', { flatIds: true }),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			address: z.string().optional(),
			category: z.enum(LocationCategoryEnum),
			description: z.string().optional(),
			heritage: LocationTwHeritageSchema.optional(),
			links: LinkSchema.array().optional(),
			mood: z.enum(['light', 'neutral', 'dark']).default('neutral'),
			notes: z.string().optional(),
			regions: reference('regions').array().min(1),
			sources: SourceSchema.array().optional(),
			status: z.enum(LocationStatusEnum),
			themes: reference('themes').array().optional(),
			...createMultilingualSchemas('address'),
			_descriptionHtml: z.string().optional(),
			_googleMapsUrl: z.url().optional(),
			_imageThumbnail: ImageThumbnailSchema.optional(),
			_nearby: LocationsNearbyItemSchema.array().optional(),
			_postCount: z.number().int().optional(),
			_posts: z.string().array().optional(),
			_url: z.url().optional(),
			_uuid: z.string().optional(),
			_wikipediaUrl: z.url().optional(),
			dateCreated: DateSchema,
			dateRecorded: DateRecordedSchema.optional(),
			dateUpdated: DateSchema.optional(),
			entryQuality: NumericScaleSchema,
			formerIds: z.string().array().optional(),
			geometry: z.union([GeometryPointsSchema, GeometryPointsSchema.array()]),
			hideIndex: z.boolean().optional(), // Exclude from index/listing surfaces; page remains accessible
			hideLocation: z.boolean().optional(), // Do not show this location on any map
			hideSearch: z.boolean().optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			incomplete: z.boolean().optional(), // Only for personal reference
			objective: NumericScaleSchema.optional(), // Only for personal reference
			outlier: z.boolean().optional(), // Do not use this location to calculate bounding boxes
			// Override some properties for sensitive sites
			override: z
				.object({
					id: z.string().optional(),
					title: TitleSchema.optional(),
					...titleMultilingualSchema,
					regions: reference('regions').array().optional(),
				})
				.optional(),
			precision: NumericScaleSchema,
			rating: NumericScaleSchema,
			safety: NumericScaleSchema.optional(),
			skipCoordinateCheck: z.boolean().optional(), // Bypass region/coordinate validation
		})
		.strict(),
});
