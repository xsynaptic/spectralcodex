import mdxRenderer from '@astrojs/mdx/server.js';
import { prepareSyndicationHtml, syndicationSchema } from '@xsynaptic/astro-syndication/html';
import { createSyndicationRenderer } from '@xsynaptic/astro-syndication/render';
import { render } from 'astro:content';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import { stripFootnotes } from '#lib/utils/text.ts';

const syndicationSchemaWithoutSpans = {
	...syndicationSchema,
	// Feed readers ship no stylesheet, so CJK wrapper spans unwrap to plain text
	tagNames: syndicationSchema.tagNames.filter((tagName) => tagName !== 'span'),
};

export async function createRenderSyndicationContentFunction() {
	const site = new URL(import.meta.env.SITE);
	const renderFeed = await createSyndicationRenderer({
		renderers: [{ name: 'mdx', renderer: mdxRenderer }],
		site,
	});

	return async function renderSyndicationContent(entry: ComputedEntry<'locations' | 'posts'>) {
		const { Content } = await render(entry);

		return prepareSyndicationHtml(stripFootnotes(await renderFeed(Content)), {
			schema: syndicationSchemaWithoutSpans,
			site,
		});
	};
}
