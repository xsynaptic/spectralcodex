import { stylizeText } from '@xsynaptic/unified-tools';
import { z } from 'zod';

// Title schema; stylized text with a reasonable upper limit
const TITLE_CHARACTER_LENGTH = 64;

export const TitleSchema = z
	.string()
	.max(TITLE_CHARACTER_LENGTH, {
		message: `Titles must be ${String(TITLE_CHARACTER_LENGTH)} characters or fewer.`,
	})
	.transform((value) => stylizeText(value).trim());

/**
 * Date schema
 */
export const DateStringSchema = z.string().transform((value) => new Date(value));

// Numeric scale schema, from 1 to 5; used by locations and archives
export const NumericScaleSchema = z.number().int().min(1).max(5);

/**
 * Image thumbnail schema
 */
export const ImageThumbnailSchema = z.object({
	src: z.string(),
	srcSet: z.string(),
	height: z.string(),
	width: z.string(),
});

export type ImageThumbnail = z.infer<typeof ImageThumbnailSchema>;
