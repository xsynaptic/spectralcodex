import type { CollectionEntry, CollectionKey } from 'astro:content';

import { getSqliteCacheInstance, hash } from '@spectralcodex/utils';
import { stripTags, transformMarkdown } from '@xsynaptic/unified-tools';
import { countWords } from 'alfaaz';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import * as R from 'remeda';

import { MDX_COMPONENTS_TO_STRIP } from '#constants.ts';
import { stripMdxComponents } from '#lib/utils/text.ts';

const cacheInstance = getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'word-counts');

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
	const hashValue = hash({
		data: {
			id: entry.id,
			body: entry.body,
			description: 'description' in entry.data ? entry.data.description : '',
		},
	});

	const cachedCount = await cacheInstance.get<number>(hashValue);

	// Check cache first
	if (cachedCount !== undefined) {
		return cachedCount;
	}

	// Compute and cache
	let wordCount = 0;

	if (entry.body && entry.body.length > 0) {
		wordCount = computeWordCount(entry.body);
	} else if (
		'description' in entry.data &&
		entry.data.description &&
		entry.data.description.length > 0
	) {
		wordCount = computeWordCount(entry.data.description);
	}

	await cacheInstance.set(hashValue, wordCount);

	return wordCount;
}
