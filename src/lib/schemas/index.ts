import { stylizeText } from '@xsynaptic/unified-tools';
import { z } from 'zod';

import { titleMultilingualSchema, nameMultilingualSchema, publisherMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';

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

/**
 * Links
 */
const LinkItemSchema = z.object({
	title: z.string(),
	...titleMultilingualSchema,
	url: UrlSchema,
});

// Link schema; with URLs and predefined titles for commonly referenced sites
export const LinkSchema = z.union([LinkItemSchema, UrlSchema]);

// A helper utility to find the first matching link by URL fragment
export function getMatchingLinkUrl(match: string, links: Array<z.infer<typeof LinkSchema>> | undefined) {
	if (!links) return;

	for (const link of links) {
		if (typeof link === 'string' && link.includes(match)) {
				return link;
			}
		if (typeof link === 'object' && link.url.includes(match)) {
			return link.url;
		}
	}
	return;
}

/**
 * Sources
 */
const SourceAuthorSchema = z.object({
	name: z.string(),
	...nameMultilingualSchema,
});

const SourceItemSchema = z.object({
	title: z.string(),
	...titleMultilingualSchema,
	description: z.string().optional(),
	authors: SourceAuthorSchema.array().optional(),
	publisher: z.string().optional(),
	...publisherMultilingualSchema,
	datePublished: z.string().optional(),
	links: LinkSchema.array().optional(),
});

// Sources schema; individual or predefined sources both work with this schema
export const SourceSchema = z.union([SourceItemSchema, z.string()]);
