import { CUSTOM_CACHE_PATH } from 'astro:env/server';

import type { DescriptionEntry } from '#lib/utils/description.ts';

import { getSqliteCacheInstance } from '#lib/utils/cache.ts';
import { createDescriptionRenderers } from '#lib/utils/description.ts';

let descriptionRenderers: ReturnType<typeof createDescriptionRenderers> | undefined;

function getDescriptionRenderers() {
	if (!descriptionRenderers) {
		descriptionRenderers = createDescriptionRenderers({
			cache: getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'description-rendered'),
		});
	}
	return descriptionRenderers;
}

export async function getDescriptionRendered(entry: DescriptionEntry) {
	return getDescriptionRenderers().getDescriptionRendered(entry);
}

export async function getDescriptionRenderedText(entry: DescriptionEntry) {
	return getDescriptionRenderers().getDescriptionRenderedText(entry);
}
