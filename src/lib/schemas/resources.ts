import { z } from 'zod';

import {
	nameMultilingualSchema,
	publisherMultilingualSchema,
	titleMultilingualSchema,
} from '#lib/i18n/i18n-schemas.ts';
import { UrlSchema } from '#lib/schemas/index.ts';

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
