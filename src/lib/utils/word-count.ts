import type { CollectionEntry, CollectionKey } from 'astro:content';

import KeyvSqlite from '@keyv/sqlite';
import { stripTags, transformMarkdown } from '@spectralcodex/unified-tools';
import { countWords } from 'alfaaz';
import { CACHE_DIR } from 'astro:env/server';
import Keyv from 'keyv';
import path from 'node:path';
import * as R from 'remeda';

import { MDX_COMPONENTS_TO_STRIP } from '#constants.ts';
import { stripMdxComponents } from '#lib/utils/text.ts';

const keyv = new Keyv({
	store: new KeyvSqlite({
		uri: `sqlite://${path.join(CACHE_DIR, 'word-counts.sqlite')}`,
		table: 'content_word_counts',
		busyTimeout: 10_000,
	}),
	namespace: 'word-counts',
});

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
export async function getWordCount({
	entry,
	hash,
}: {
	entry: CollectionEntry<CollectionKey>;
	hash: string;
}): Promise<number | undefined> {
	// Series word counts are calculated separately (aggregated from items)
	if (entry.collection === 'series') {
		return undefined;
	}

	const cachedCount = await keyv.get<number>(hash);

	// Check cache first
	if (cachedCount !== undefined) {
		return cachedCount;
	}

	// Compute and cache
	const wordCount = !entry.body || entry.body.length === 0 ? 0 : computeWordCount(entry.body);

	await keyv.set(hash, wordCount);

	return wordCount;
}
