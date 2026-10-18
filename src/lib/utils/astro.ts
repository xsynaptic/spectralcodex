import type { AstroGlobal } from 'astro';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';

export function hasEntryContent(
	entry: ComputedEntry<'locations' | 'regions' | 'resources' | 'series' | 'themes'>,
) {
	return 'body' in entry && typeof entry.body === 'string' && entry.body.trim().length > 0;
}

// Safely renders an Astro slot, returning undefined if the content is empty or whitespace-only
export async function renderSlot(slots: AstroGlobal['slots'], slotName = 'default') {
	const content = (await slots.render(slotName)) as string | undefined;
	const contentTrimmed = content ? content.trim() : undefined;

	return contentTrimmed ?? undefined;
}

const renderedSlots = new Map<string, Promise<string>>();

export function renderSlotCached(slots: AstroGlobal['slots'], cacheKey: string) {
	if (import.meta.env.DEV) return slots.render('default');

	const cached = renderedSlots.get(cacheKey);

	if (cached) return cached;

	const rendered = slots.render('default');

	renderedSlots.set(cacheKey, rendered);

	return rendered;
}
