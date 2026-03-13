import type { DataStoreEntry } from '../shared/data-store.ts';

// Matches markdown links: [text](https://...)
// Excludes image references ![alt](url) via negative lookbehind
// Handles escaped parens in URLs like \(Taiwan\)
const MARKDOWN_LINK_REGEX = /(?<!!)\[(?:[^\]]*)\]\((https?:\/\/(?:[^)\\]|\\.)+)\)/g;

interface ExtractedLink {
	url: string;
}

/**
 * Extract URLs from a single frontmatter `links` array item.
 * Items can be plain URL strings or {title, url} objects.
 */
function extractFrontmatterLinks(data: Record<string, unknown>): Array<string> {
	const urls: Array<string> = [];

	// links array
	const links = data.links as Array<unknown> | undefined;

	if (Array.isArray(links)) {
		for (const link of links) {
			if (typeof link === 'string') {
				urls.push(link);
			} else if (link && typeof link === 'object' && 'url' in link) {
				const url = (link as Record<string, unknown>).url;

				if (typeof url === 'string') {
					urls.push(url);
				}
			}
		}
	}

	// Top-level url field (resources collection)
	const topUrl = data.url as string | undefined;

	if (typeof topUrl === 'string') {
		urls.push(topUrl);
	}

	// Sources array; can contain objects with nested links arrays
	const sources = data.sources as Array<unknown> | undefined;

	if (Array.isArray(sources)) {
		for (const source of sources) {
			if (source && typeof source === 'object' && 'links' in source) {
				const sourceLinks = (source as Record<string, unknown>).links as Array<unknown> | undefined;

				if (Array.isArray(sourceLinks)) {
					for (const link of sourceLinks) {
						if (typeof link === 'string') {
							urls.push(link);
						} else if (link && typeof link === 'object' && 'url' in link) {
							const url = (link as Record<string, unknown>).url;

							if (typeof url === 'string') {
								urls.push(url);
							}
						}
					}
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
