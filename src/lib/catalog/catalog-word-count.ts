import type { CollectionEntry, CollectionKey } from 'astro:content';
import type Keyv from 'keyv';

import { stripTags } from '@xsynaptic/unified-tools';
import { countWords } from '@xsynaptic/word-count';
import { hash } from 'ohash';
import * as R from 'remeda';

import { mdxComponents } from '#constants.ts';
import { renderMarkdownInline } from '#lib/utils/text.ts';
import { stripMdxComponents } from '#lib/utils/text.ts';

interface WordCountCached {
	hash: string;
	count: number;
}

// Only correct because MDX components add decoration, not text from outside sources
function computeWordCount(body: string): number {
	return R.pipe(
		body,
		(body) => stripMdxComponents(body, mdxComponents),
		(body) => renderMarkdownInline(body),
		stripTags,
		countWords,
	);
}

// `''` rather than `undefined` for a missing field, so cached content hashes stay stable
function getDescription(entry: CollectionEntry<CollectionKey>): string | undefined {
	return 'description' in entry.data ? entry.data.description : '';
}

export function createWordCountFunction({ cache }: { cache: Keyv }) {
	return async function getWordCount(
		entry: CollectionEntry<CollectionKey>,
	): Promise<number | undefined> {
		const description = getDescription(entry);

		// Key by entry ID so edits overwrite the old row; the hash validates cached content
		// MDX component names participate so render-affecting code changes self-invalidate
		const contentHash = hash({
			data: {
				body: entry.body,
				description,
				mdxComponents,
				version: 1,
			},
		});

		const cached = await cache.get<WordCountCached>(entry.id);

		if (cached?.hash === contentHash) {
			return cached.count;
		}

		const source = entry.body || description;
		const wordCount = source ? computeWordCount(source) : 0;

		await cache.set(entry.id, {
			hash: contentHash,
			count: wordCount,
		} satisfies WordCountCached);

		return wordCount;
	};
}
