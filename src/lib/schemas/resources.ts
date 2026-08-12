import { z } from 'zod';

import { createMultilingualSchemas, titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';

const LinkItemSchema = z.object({
	title: z.string(),
	...titleMultilingualSchema,
	url: z.url(),
});

// Link schema; with URLs and predefined titles for commonly referenced sites
export const LinkSchema = z.union([LinkItemSchema, z.url()]);

// A helper utility to find the first matching link by URL fragment
export function getMatchingLinkUrl(
	match: string,
	links: Array<z.infer<typeof LinkSchema>> | undefined,
) {
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

const nameMultilingualSchema = createMultilingualSchemas('name');

const publisherMultilingualSchema = createMultilingualSchemas('publisher');

const publishedContainerMultilingualSchema = createMultilingualSchemas('publishedContainer');

const publishedDetailsMultilingualSchema = createMultilingualSchemas('publishedDetails');

const ResourceAuthorSchema = z.object({
	name: z.string(),
	...nameMultilingualSchema,
});

// The shared entity shape: an external work, whether it has an Entry of its own or is written inline
export const ResourceSchema = z.object({
	title: z.string(),
	...titleMultilingualSchema,
	description: z.string().optional(),
	url: z.url().optional(),
	// Bibliographic kind; a subset of CSL 1.0.2 item types, so citation formatting can defer to CSL
	// Anything on the web is a `webpage` at whatever granularity; its venue belongs in publishedContainer
	resourceType: z.enum(['webpage', 'book', 'chapter', 'article', 'report', 'dataset', 'software']),
	authors: ResourceAuthorSchema.array().optional(),
	publisher: z.string().optional(),
	...publisherMultilingualSchema,
	publishedContainer: z.string().optional(),
	...publishedContainerMultilingualSchema,
	publishedDate: z.string().optional(),
	publishedDetails: z.string().optional(),
	...publishedDetailsMultilingualSchema,
	links: LinkSchema.array().optional(),
});

// The citation relation: either the ID of a Resource entry, or a Resource written out inline
export const SourceSchema = z.union([ResourceSchema, z.string()]);
