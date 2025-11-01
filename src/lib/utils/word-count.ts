import type { CollectionEntry, CollectionKey } from 'astro:content';

import { stripTags, transformMarkdown } from '@spectralcodex/unified-tools';
import { countWords } from 'alfaaz';
import * as R from 'remeda';

import { MDX_COMPONENTS_TO_STRIP } from '#constants.ts';
import { getCacheInstance, hashData } from '#lib/utils/cache.ts';
import { stripMdxComponents } from '#lib/utils/text.ts';

const cacheInstance = getCacheInstance('word-counts');

/**
 * Generate word count from content body
 * Strips MDX components, transforms markdown to HTML, strips tags, then counts words
 * This method won't work if your MDX components introduce text from outside sources
 * But for this project MDX mainly adds decorative classes so we can get away with this
 */
function computeWordCount(body: string): number {
	return R.pipe(
		body,
		(body) => stripMdxComponents(body, MDX_COMPONENTS_TO_STRIP),
		(body) => transformMarkdown({ input: body }),
		stripTags,
		countWords,
	);
}

/**
 * Get word count with caching
 * Returns function that computes or retrieves cached word count for entry body content
 */
export async function getWordCount(
	entry: CollectionEntry<CollectionKey>,
): Promise<number | undefined> {
	// Series word counts are calculated separately (aggregated from items)
	if (entry.collection === 'series') {
		return undefined;
	}

	const hash = hashData({ data: { id: entry.id, body: entry.body } });

	const cachedCount = await cacheInstance.get<number>(hash);

	// Check cache first
	if (cachedCount !== undefined) {
		return cachedCount;
	}

	// Compute and cache
	const wordCount = !entry.body || entry.body.length === 0 ? 0 : computeWordCount(entry.body);

	await cacheInstance.set(hash, wordCount);

	return wordCount;
}
