import { z } from 'zod';

import type { DataStoreEntry } from '../shared/data-store.ts';

// Matches markdown links: [text](https://...)
// Excludes image references ![alt](url) via negative lookbehind
// Handles escaped parens in URLs like \(Taiwan\)
const MARKDOWN_LINK_REGEX = /(?<!!)\[(?:[^\]]*)\]\((https?:\/\/(?:[^)\\]|\\.)+)\)/g;

// Minimal extraction schemas; only the fields needed to pull URLs
const LinkExtractSchema = z.union([z.string(), z.object({ url: z.string() })]);

const SourceExtractSchema = z.union([
	z.string(),
	z.object({ links: LinkExtractSchema.array().optional() }),
]);

const EntryDataSchema = z.object({
	links: LinkExtractSchema.array().optional(),
	url: z.string().optional(),
	sources: SourceExtractSchema.array().optional(),
});
interface ExtractedLink {
	url: string;
}

function extractUrlFromLink(link: z.infer<typeof LinkExtractSchema>): string {
	return typeof link === 'string' ? link : link.url;
}

/**
 * Extract URLs from frontmatter fields: links, url, and sources
 */
function extractFrontmatterLinks(data: Record<string, unknown>): Array<string> {
	const result = EntryDataSchema.safeParse(data);

	if (!result.success) {
		return [];
	}

	const urls: Array<string> = [];
	const { links, url, sources } = result.data;

	if (links) {
		for (const link of links) {
			urls.push(extractUrlFromLink(link));
		}
	}

	if (url) {
		urls.push(url);
	}

	if (sources) {
		for (const source of sources) {
			if (typeof source !== 'string' && source.links) {
				for (const link of source.links) {
					urls.push(extractUrlFromLink(link));
				}
			}
		}
	}

	return urls;
}

/**
 * Extract markdown link URLs from a body string
 */
function extractBodyLinks(body: string): Array<string> {
	const urls: Array<string> = [];

	for (const match of body.matchAll(MARKDOWN_LINK_REGEX)) {
		if (match[1]) {
			// Unescape markdown-escaped characters (e.g. \( \) in Wikipedia URLs)
			urls.push(match[1].replaceAll('\\', ''));
		}
	}

	return urls;
}

/**
 * Extract all external URLs from a data store entry
 */
export function extractLinksFromEntry(entry: DataStoreEntry): Array<ExtractedLink> {
	const links: Array<ExtractedLink> = [];

	for (const url of extractFrontmatterLinks(entry.data)) {
		links.push({ url });
	}

	if (entry.body) {
		for (const url of extractBodyLinks(entry.body)) {
			links.push({ url });
		}
	}

	return links;
}
