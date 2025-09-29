import type { Options as RehypeSanitizeOptions } from 'rehype-sanitize';

import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';

export function sanitizeHtml(input: string, options?: RehypeSanitizeOptions): string {
	const processor = unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeSanitize, options)
		.use(rehypeStringify)
		.processSync(input);

	return String(processor);
}

// Handy shortcut for when you just want to strip tags from text
export const stripTags = (input: string, options?: RehypeSanitizeOptions): string =>
	sanitizeHtml(input, { ...options, tagNames: [] });

/**
 * Strips GFM-style footnotes from HTML content using a simple regex approach
 */
export function stripFootnotes(input: string): string {
	// Remove footnote references (`sup` elements with footnote links)
	let result = input.replaceAll(/<sup><a[^>]*data-footnote-ref[^>]*>.*?<\/a><\/sup>/gi, '');

	// Remove the entire footnotes section
	result = result.replaceAll(/<section[^>]*data-footnotes[^>]*>.*?<\/section>/gis, '');

	return result;
}
