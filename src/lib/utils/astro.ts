import type { AstroGlobal } from 'astro';
import type { CollectionEntry } from 'astro:content';

import mdxRenderer from '@astrojs/mdx/server.js';
import {
	experimental_AstroContainer as AstroContainer,
	type ContainerRenderOptions,
} from 'astro/container';
import { render } from 'astro:content';

/**
 * Use Astro's Container API to render MDX content
 * TODO: because there is only one container all rendering is serial; can we run multiple containers in parallel?
 * @link https://docs.astro.build/en/reference/container-reference/
 */
export async function getRenderMdxFunction() {
	const container = await AstroContainer.create();

	container.addServerRenderer({ name: 'mdx', renderer: mdxRenderer });

	return async function (
		entry: CollectionEntry<'ephemera' | 'locations' | 'pages' | 'posts'>,
		options?: ContainerRenderOptions,
	) {
		const { Content } = await render(entry);

		return await container.renderToString(Content, options);
	};
}

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
