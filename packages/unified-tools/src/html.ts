import type { Options as RehypeSanitizeOptions } from 'rehype-sanitize';

import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';

export function sanitizeHtml(input: string, options?: RehypeSanitizeOptions) {
	const processor = unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeSanitize, options)
		.use(rehypeStringify)
		.processSync(input);

	return String(processor);
}

// Handy shortcut for when you just want to strip tags from text
export const stripTags = (input: string, options?: RehypeSanitizeOptions) =>
	sanitizeHtml(input, { ...options, tagNames: [] });
