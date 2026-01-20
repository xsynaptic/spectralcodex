import { stylizeText } from '@xsynaptic/unified-tools';
import { z } from 'zod';

// Stylized text schema; apply SmartyPants to arbitrary strings
export const StylizedTextSchema = z.string().transform((value) => stylizeText(value).trim());

/**
 * Description schema
 */
// Descriptions should meet basic SEO requirements
const DESCRIPTION_CHARACTER_LENGTH = 30;

export const DescriptionSchema = z
	.string()
	.min(DESCRIPTION_CHARACTER_LENGTH, {
		message: `Descriptions must be ${String(DESCRIPTION_CHARACTER_LENGTH)} or more characters long.`,
	})
	.transform((value) => value.trim()); // Markdown may be present so we don't further transform the value

	/**
	 * Date schema
	 */
export const DateStringSchema = z.string().transform((value) => new Date(value));

// Numeric scale schema, from 1 to 5; used by locations and timelines
export const NumericScaleSchema = z.number().int().min(1).max(5);

// Zod 3 uses a very permissive URL schema via z.string().url(); this makes it more strict
export const UrlSchema = z
	.string()
	.refine((value) => /^(https?):\/\/(?=.*\.[a-z]{2,})[^\s$.?#].[^\s]*$/i.test(value), {
		message: 'Please enter a valid URL',
	});

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
