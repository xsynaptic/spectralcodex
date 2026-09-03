import { z } from 'zod';

import type { ContentEntry } from '../shared/astro-content.js';

// Matches markdown links: [text](https://...)
// Excludes image references ![alt](url) via negative lookbehind
// Handles escaped parens in URLs like \(Taiwan\)
const markdownLinkRegex = /(?<!!)\[(?:[^\]]*)\]\((https?:\/\/(?:[^)\\]|\\.)+)\)/g;

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

function extractUrlFromLink(link: z.infer<typeof LinkExtractSchema>): string {
	return typeof link === 'string' ? link : link.url;
}

function extractUrlsFromSource(source: z.infer<typeof SourceExtractSchema>): Array<string> {
	if (typeof source === 'string' || !source.links) return [];

	return source.links.map(extractUrlFromLink);
}

// Extract URLs from frontmatter fields: links, url, and sources
function extractFrontmatterLinks(data: Record<string, unknown>): Array<string> {
	const result = EntryDataSchema.safeParse(data);

	if (!result.success) {
		return [];
	}

	const { links, url, sources } = result.data;

	return [
		...(links?.map(extractUrlFromLink) ?? []),
		...(url ? [url] : []),
		...(sources?.flatMap(extractUrlsFromSource) ?? []),
	];
}

// Extract markdown link URLs from a body string
function extractBodyLinks(body: string): Array<string> {
	const urls: Array<string> = [];

	for (const match of body.matchAll(markdownLinkRegex)) {
		if (match[1]) {
			// Unescape markdown-escaped characters (e.g. \( \) in Wikipedia URLs)
			urls.push(match[1].replaceAll('\\', ''));
		}
	}

	return urls;
}

// Extract all external URLs from a data store entry
export function extractLinksFromEntry(entry: ContentEntry) {
	const links: Array<{
		url: string;
	}> = Array.from(extractFrontmatterLinks(entry.data), (url) => ({ url }));

	if (entry.body) {
		for (const url of extractBodyLinks(entry.body)) {
			links.push({ url });
		}
	}

	return links;
}
