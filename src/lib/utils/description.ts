import type { Cache } from '@spectralcodex/shared/cache';

import { sanitizeHtml, stripTags } from '@xsynaptic/unified-tools';
import { hash } from 'ohash';
import * as R from 'remeda';

import { hashShortLength, mdxComponents } from '#constants.ts';
import { renderMarkdownInline } from '#lib/utils/text.ts';
import { stripFootnoteReferences, stripMdxComponents, textClipper } from '#lib/utils/text.ts';

export interface DescriptionEntry {
	body?: string | undefined;
	data: { description?: string | undefined };
	id: string;
}

export interface DescriptionRendered {
	html: string;
	text: string;
}

// Buffered past wordCountFinal so orphan markdown syntax falls outside the clip boundary
const wordCountBuffer = 150;
const wordCountFinal = 100;

// Allow em/strong plus span so CJK wrapping survives in the rendered excerpt (shown in the map)
const descriptionSchema = {
	attributes: { span: ['className'] },
	tagNames: ['em', 'strong', 'span'],
};

export function createDescriptionRenderers({ cache }: { cache: Cache<DescriptionRendered> }) {
	// Render and cache both HTML and plain-text forms of an entry's description in a single parse
	function getDescriptionRendered(entry: DescriptionEntry): DescriptionRendered | undefined {
		const source = getDescription(entry, { wordCount: wordCountBuffer });

		if (!source) return undefined;

		// Key by entry ID so edits overwrite the old row; the hash validates cached content
		// MDX component names participate so render-affecting code changes self-invalidate
		const sourceHash = hash({ mdxComponents, source, version: 3 }).slice(0, hashShortLength);

		const cached = cache.get(entry.id, sourceHash);

		if (cached) return cached;

		const rawHtml = renderMarkdownInline(source);

		const html = sanitizeHtml(rawHtml, descriptionSchema);
		const stripped = stripTags(rawHtml).replaceAll(/\s+/g, ' ').trim();
		const text = textClipper(stripped, { wordCount: wordCountFinal });

		const rendered: DescriptionRendered = { html, text };

		cache.set(entry.id, sourceHash, rendered);

		return rendered;
	}

	function getDescriptionRenderedText(entry: DescriptionEntry) {
		return getDescriptionRendered(entry)?.text;
	}

	return { getDescriptionRendered, getDescriptionRenderedText };
}

// Return the frontmatter description or derive a clipped excerpt from the body
export function getDescription(
	entry: {
		body?: string | undefined;
		data: { description?: string | undefined };
	},
	options: { wordCount?: number } = {},
): string | undefined {
	if (entry.data.description) {
		return entry.data.description;
	}
	if (entry.body) {
		return R.pipe(
			entry.body,
			(body) => stripMdxComponents(body, mdxComponents),
			stripFootnoteReferences,
			(text) => textClipper(text.trim(), { wordCount: options.wordCount ?? 100 }),
		);
	}
	return undefined;
}
