import type Keyv from 'keyv';

import { sanitizeHtml, stripTags } from '@xsynaptic/unified-tools';
import { hash } from 'ohash';
import * as R from 'remeda';

import { hashShortLength, mdxComponents } from '#constants.ts';
import { renderMarkdownInline } from '#lib/utils/text.ts';
import { stripFootnoteReferences, stripMdxComponents, textClipper } from '#lib/utils/text.ts';

interface DescriptionRendered {
	html: string;
	text: string;
}

interface DescriptionCached extends DescriptionRendered {
	hash: string;
}

export interface DescriptionEntry {
	id: string;
	data: { description?: string | undefined };
	body?: string | undefined;
}

// Buffered past wordCountFinal so orphan markdown syntax falls outside the clip boundary
const wordCountBuffer = 150;
const wordCountFinal = 100;

// Allow em/strong plus span so CJK wrapping survives in the rendered excerpt (shown in the map)
const descriptionSchema = {
	tagNames: ['em', 'strong', 'span'],
	attributes: { span: ['className'] },
};

// Return the frontmatter description or derive a clipped excerpt from the body
export function getDescription(
	entry: {
		data: { description?: string | undefined };
		body?: string | undefined;
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

export function createDescriptionRenderers({ cache }: { cache: Keyv }) {
	// Render and cache both HTML and plain-text forms of an entry's description in a single parse
	async function getDescriptionRendered(
		entry: DescriptionEntry,
	): Promise<DescriptionRendered | undefined> {
		const source = getDescription(entry, { wordCount: wordCountBuffer });

		if (!source) return undefined;

		// Key by entry ID so edits overwrite the old row; the hash validates cached content
		// MDX component names participate so render-affecting code changes self-invalidate
		const sourceHash = hash({ source, mdxComponents, version: 3 }).slice(0, hashShortLength);

		const cached = await cache.get<DescriptionCached>(entry.id);

		if (cached?.hash === sourceHash) return { html: cached.html, text: cached.text };

		const rawHtml = renderMarkdownInline(source);

		const html = sanitizeHtml(rawHtml, descriptionSchema);
		const stripped = stripTags(rawHtml).replaceAll(/\s+/g, ' ').trim();
		const text = textClipper(stripped, { wordCount: wordCountFinal });

		const rendered: DescriptionRendered = { html, text };

		await cache.set(entry.id, { hash: sourceHash, ...rendered } satisfies DescriptionCached);

		return rendered;
	}

	async function getDescriptionRenderedText(entry: DescriptionEntry): Promise<string | undefined> {
		const rendered = await getDescriptionRendered(entry);

		return rendered?.text;
	}

	return { getDescriptionRendered, getDescriptionRenderedText };
}
