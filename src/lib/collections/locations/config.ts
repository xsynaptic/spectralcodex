import { LocationCategoryEnum, LocationStatusEnum } from '@spectralcodex/react-map-component';
import { glob } from 'astro/loaders';
import { defineCollection, reference, z } from 'astro:content';
import { COLLECTIONS_PATH } from 'astro:env/server';

import { LocationTwHeritageSchema } from '@/lib/collections/locations/schemas';
import {
	DateStringSchema,
	DescriptionSchema,
	NumericScaleSchema,
	TitleSchema,
} from '@/lib/schemas/content';
import { GeometrySchema } from '@/lib/schemas/geometry';
import { LinkSchema } from '@/lib/schemas/links';
import { SourceSchema } from '@/lib/schemas/sources';

export const locations = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${COLLECTIONS_PATH}/locations` }),
	schema: z
		.object({
			slug: z.string(),
			title: TitleSchema,
			titleAlt: z.string().optional(),
			description: DescriptionSchema,
			category: z.nativeEnum(LocationCategoryEnum),
			status: z.nativeEnum(LocationStatusEnum),
			heritage: LocationTwHeritageSchema.optional(),
			locations: reference('locations').array().optional(),
			regions: reference('regions').array(),
			themes: reference('themes').array().optional(),
			links: LinkSchema.array().optional(),
			sources: SourceSchema.array().optional(),
			notes: z.string().optional(),
			address: z.string().optional(),
			geometry: GeometrySchema,
			precision: NumericScaleSchema,
			dateCreated: DateStringSchema,
			dateUpdated: DateStringSchema.optional(),
			dateVisited: DateStringSchema.array().optional(),
			imageFeatured: reference('images').optional(),
			imageHero: reference('images').optional(),
			rating: NumericScaleSchema,
			safety: NumericScaleSchema.optional(),
			entryQuality: NumericScaleSchema,
			hideLocation: z.boolean().optional(), // Do not show this location on any map
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
			imageThumbnail: z
				.object({
					src: z.string(),
					srcSet: z.string(),
					height: z.string(),
					width: z.string(),
				})
				.optional(),
			url: z.string().url().optional(),
			googleMapsUrl: z.string().url().optional(),
			wikipediaUrl: z.string().url().optional(),
		})
		.strict(),
});
