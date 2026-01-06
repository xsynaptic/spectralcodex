import { LocationCategoryEnum, LocationStatusEnum } from '@spectralcodex/map-types';
import { LocationLayerEnum } from '@spectralcodex/map-types';
import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { LocationTwHeritageSchema } from '#lib/collections/locations/schemas.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { ImageFeaturedSchema } from '#lib/image/image-featured.ts';
import { GeometryPointsSchema } from '#lib/schemas/geometry.ts';
import { ImageThumbnailSchema } from '#lib/schemas/index.ts';
import {
	DateStringSchema,
	DescriptionSchema,
	NumericScaleSchema,
	StylizedTextSchema,
} from '#lib/schemas/index.ts';
import { UrlSchema } from '#lib/schemas/index.ts';
import { LinkSchema } from '#lib/schemas/links.ts';
import { SourceSchema } from '#lib/schemas/sources.ts';

export const locations = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/locations` }),
	schema: z
		.object({
			slug: z.string(),
			title: StylizedTextSchema,
			...titleMultilingualSchema,
			description: DescriptionSchema,
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
			showHero: z.boolean().optional(),
			rating: NumericScaleSchema,
			safety: NumericScaleSchema.optional(),
			entryQuality: NumericScaleSchema,
			hideLocation: z.boolean().optional(), // Do not show this location on any map
			// Override some properties for sensitive sites
			override: z
				.object({
					slug: z.string().optional(),
					title: StylizedTextSchema.optional(),
					...titleMultilingualSchema,
					regions: reference('regions').array().optional(),
				})
				.optional(),
			outlier: z.boolean().optional(), // Do not use this location to calculate bounding boxes
			objective: NumericScaleSchema.optional(), // Only for personal reference
			incomplete: z.boolean().optional(), // Only for personal reference
			/** Derived properties, for internal use only! */
			nearby: z
				.object({
					locationId: z.string(),
					distance: z.number().int(),
					distanceDisplay: z.string(),
				})
				.array()
				.optional(),
			posts: z.string().array().optional(),
			postCount: z.number().int().optional(),
			/** Map properties, for internal use only! */
			uuid: z.string().optional(),
			descriptionHtml: z.string().optional(),
			imageThumbnail: ImageThumbnailSchema.optional(),
			url: UrlSchema.optional(),
			googleMapsUrl: UrlSchema.optional(),
			wikipediaUrl: UrlSchema.optional(),
			hideSearch: z.boolean().optional(),
		})
		.strict(),
});
