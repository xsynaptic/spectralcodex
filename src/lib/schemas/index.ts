import { z } from 'zod';

import { refineTypography } from '#lib/utils/text.ts';

// Title schema; stylized text with a reasonable upper limit
const titleCharacterLength = 80;

export const TitleSchema = z
	.string()
	.max(titleCharacterLength, {
		message: `Titles must be ${String(titleCharacterLength)} characters or fewer.`,
	})
	.transform((value) => refineTypography(value).trim());

// YAML parses `YYYY-MM-DD` and `YYYY-MM-DD HH:mm:ss` into UTC dates
// A time without seconds remains a string and will fail this check
export const DateSchema = z.date();

const DateValueSchema = z
	.date()
	.transform((date) => ({ date, hasTime: date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 }));

export const DateRecordedSchema = z
	.union([DateValueSchema, z.tuple([DateValueSchema, DateValueSchema])])
	.array();

// Numeric scale schema, from 1 to 5; used by locations and chronology
export const NumericScaleSchema = z.number().int().min(1).max(5);

// Image thumbnail schema
export const ImageThumbnailSchema = z.object({
	srcSet: z.string(),
});

export type ImageThumbnail = z.infer<typeof ImageThumbnailSchema>;
