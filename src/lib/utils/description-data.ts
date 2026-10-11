import { createSqliteCache } from '@spectralcodex/shared/cache';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';

import type { DescriptionEntry } from '#lib/utils/description.ts';

import { createDescriptionRenderers } from '#lib/utils/description.ts';

let descriptionRenderers: ReturnType<typeof createDescriptionRenderers> | undefined;

export function getDescriptionRendered(entry: DescriptionEntry) {
	return getDescriptionRenderers().getDescriptionRendered(entry);
}

export function getDescriptionRenderedText(entry: DescriptionEntry) {
	return getDescriptionRenderers().getDescriptionRenderedText(entry);
}

function getDescriptionRenderers() {
	if (!descriptionRenderers) {
		descriptionRenderers = createDescriptionRenderers({
			cache: createSqliteCache(CUSTOM_CACHE_PATH, 'description-rendered'),
		});
	}
	return descriptionRenderers;
}
