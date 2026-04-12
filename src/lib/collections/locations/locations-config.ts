import { LocationCategoryEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { LocationLayerEnum } from '@spectralcodex/shared/map';
import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import {
	LocationsNearbyItemSchema,
	LocationTwHeritageSchema,
} from '#lib/collections/locations/locations-schemas.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { GeometryPointsSchema } from '#lib/schemas/geometry.ts';
import { ImageThumbnailSchema } from '#lib/schemas/index.ts';
import { DateStringSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/index.ts';
import { LinkSchema, SourceSchema } from '#lib/schemas/resources.ts';

export const locations = defineCollection({
	loader: glob({
		pattern: '**/[^_]*.(md|mdx)',
		base: `${CONTENT_COLLECTIONS_PATH}/locations`,
		generateId: ({ entry }) => entry.replace(/^.*\//, '').replace(/\.(md|mdx)$/, ''),
	}),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			description: z.string().optional(),
			layer: z.enum(LocationLayerEnum).default(LocationLayerEnum.Neutral),
			category: z.enum(LocationCategoryEnum),
			status: z.enum(LocationStatusEnum),
			heritage: LocationTwHeritageSchema.optional(),
			locations: reference('locations').array().optional(),
			regions: reference('regions').array(),
			themes: reference('themes').array().optional(),
			links: LinkSchema.array().optional(),
			sources: SourceSchema.array().optional(),
			notes: z.string().optional(),
			address: z.string().optional(),
			precision: NumericScaleSchema,
			geometry: z.union([GeometryPointsSchema, GeometryPointsSchema.array()]),
			dateCreated: DateStringSchema,
			dateUpdated: DateStringSchema.optional(),
			dateVisited: DateStringSchema.array().optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			rating: NumericScaleSchema,
			safety: NumericScaleSchema.optional(),
			entryQuality: NumericScaleSchema,
			formerIds: z.string().array().optional(),
			hideLocation: z.boolean().optional(), // Do not show this location on any map
			// Override some properties for sensitive sites
			override: z
				.object({
					id: z.string().optional(),
					title: TitleSchema.optional(),
					...titleMultilingualSchema,
					regions: reference('regions').array().optional(),
				})
				.optional(),
			outlier: z.boolean().optional(), // Do not use this location to calculate bounding boxes
			objective: NumericScaleSchema.optional(), // Only for personal reference
			incomplete: z.boolean().optional(), // Only for personal reference
			hideSearch: z.boolean().optional(),
			/** Computed properties, for internal use only! */
			_nearby: LocationsNearbyItemSchema.array().optional(),
			_posts: z.string().array().optional(),
			_postCount: z.number().int().optional(),
			/** Map properties, for internal use only! */
			_uuid: z.string().optional(),
			_descriptionHtml: z.string().optional(),
			_imageThumbnail: ImageThumbnailSchema.optional(),
			_url: z.url().optional(),
			_googleMapsUrl: z.url().optional(),
			_wikipediaUrl: z.url().optional(),
		})
		.strict(),
});
