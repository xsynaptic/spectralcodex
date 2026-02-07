import type { AstroGlobal } from 'astro';
import type { CollectionEntry } from 'astro:content';

// Used to conditionally render descriptions or body contents of an entry
export function getHasContent(
	entry: CollectionEntry<'locations' | 'regions' | 'resources' | 'series' | 'themes'>,
) {
	return 'body' in entry && typeof entry.body === 'string' && entry.body.trim().length > 0;
}

/**
 * Safely renders an Astro slot, returning undefined if the content is empty or whitespace-only
 */
export async function renderSlot(slots: AstroGlobal['slots'], slotName = 'default') {
	const content = (await slots.render(slotName)) as string | undefined;
	const contentTrimmed = content ? content.trim() : undefined;

	return contentTrimmed ?? undefined;
}
