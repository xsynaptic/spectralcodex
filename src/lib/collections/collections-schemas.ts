import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { z } from 'zod';

import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { DateSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/index.ts';

export const entrySchemaFields = {
	title: TitleSchema,
	...titleMultilingualSchema,
	dateCreated: DateSchema,
	dateUpdated: DateSchema.optional(),
	description: z.string().optional(),
	entryQuality: NumericScaleSchema,
	formerIds: z.string().array().optional(),
	imageFeatured: ImageFeaturedSchema.optional(),
};
