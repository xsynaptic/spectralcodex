import type { CollectionEntry, CollectionKey } from 'astro:content';

import { hash } from '@spectralcodex/shared/cache';
import { getSqliteCacheInstance } from '@spectralcodex/shared/cache/sqlite';
import { stripTags } from '@xsynaptic/unified-tools';
import { countWords } from '@xsynaptic/word-count';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import * as R from 'remeda';

import { MDX_COMPONENTS } from '#constants.ts';
import { renderMarkdownInline } from '#lib/utils/text.ts';
import { stripMdxComponents } from '#lib/utils/text.ts';

const cacheInstance = getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'word-counts');

interface WordCountCached {
	hash: string;
	count: number;
}

/**
 * Generate word count from content body
 * Strips MDX components, transforms markdown to HTML, strips tags, then counts words
 * This method won't work if your MDX components introduce text from outside sources
 * But for this project MDX mainly adds decorative classes so we can get away with this
 */
function computeWordCount(body: string): number {
	return R.pipe(
		body,
		(body) => stripMdxComponents(body, MDX_COMPONENTS),
		(body) => renderMarkdownInline(body),
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
	// Key by entry ID so edits overwrite the old row; the hash validates cached content
	// MDX component names participate so render-affecting code changes self-invalidate
	const contentHash = hash({
		data: {
			body: entry.body,
			description: 'description' in entry.data ? entry.data.description : '',
			mdxComponents: MDX_COMPONENTS,
			version: 1,
		},
	});

	const cached = await cacheInstance.get<WordCountCached>(entry.id);

	// Check cache first
	if (cached?.hash === contentHash) {
		return cached.count;
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

	await cacheInstance.set(entry.id, {
		hash: contentHash,
		count: wordCount,
	} satisfies WordCountCached);

	return wordCount;
}
