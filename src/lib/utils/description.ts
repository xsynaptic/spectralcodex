import { hashShort } from '@spectralcodex/shared/cache';
import { getSqliteCacheInstance } from '@spectralcodex/shared/cache/sqlite';
import { sanitizeHtml, stripTags } from '@xsynaptic/unified-tools';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import * as R from 'remeda';

import { MDX_COMPONENTS } from '#constants.ts';
import { renderMarkdownInline } from '#lib/utils/text.ts';
import { stripFootnoteReferences, stripMdxComponents, textClipper } from '#lib/utils/text.ts';

interface DescriptionRendered {
	html: string;
	text: string;
}

interface DescriptionCached extends DescriptionRendered {
	hash: string;
}

/**
 * Count of words to feed into the markdown transformer
 * This is buffered so any orphan markdown syntax falls outside the clip boundary
 */
const wordCountBuffer = 150;
const wordCountFinal = 100;

// Allow em/strong plus span so CJK wrapping survives in the rendered excerpt (shown in the map)
const descriptionSchema = {
	tagNames: ['em', 'strong', 'span'],
	attributes: { span: ['className'] },
};

const cacheInstance = getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'description-rendered');

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
			(body) => stripMdxComponents(body, MDX_COMPONENTS),
			stripFootnoteReferences,
			(text) => textClipper(text.trim(), { wordCount: options.wordCount ?? 100 }),
		);
	}
	return undefined;
}

// Render and cache both HTML and plain-text forms of an entry's description in a single parse
export async function getDescriptionRendered(entry: {
	id: string;
	data: { description?: string | undefined };
	body?: string | undefined;
}): Promise<DescriptionRendered | undefined> {
	const source = getDescription(entry, { wordCount: wordCountBuffer });

	if (!source) return undefined;

	// Key by entry ID so edits overwrite the old row; the hash validates cached content
	// MDX component names participate so render-affecting code changes self-invalidate
	const sourceHash = hashShort({
		data: { source, mdxComponents: MDX_COMPONENTS, version: 3 },
	});

	const cached = await cacheInstance.get<DescriptionCached>(entry.id);

	if (cached?.hash === sourceHash) return { html: cached.html, text: cached.text };

	const rawHtml = renderMarkdownInline(source);

	const html = sanitizeHtml(rawHtml, descriptionSchema);
	const stripped = stripTags(rawHtml).replaceAll(/\s+/g, ' ').trim();
	const text = textClipper(stripped, { wordCount: wordCountFinal });

	const rendered: DescriptionRendered = { html, text };

	await cacheInstance.set(entry.id, { hash: sourceHash, ...rendered } satisfies DescriptionCached);

	return rendered;
}

export async function getDescriptionRenderedText(entry: {
	id: string;
	data: { description?: string | undefined };
	body?: string | undefined;
}): Promise<string | undefined> {
	const rendered = await getDescriptionRendered(entry);

	return rendered?.text;
}
