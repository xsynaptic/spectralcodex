import type { ContainerRenderOptions } from 'astro/container';

import mdxRenderer from '@astrojs/mdx/server.js';
import { defaultSchema, sanitizeHtml } from '@xsynaptic/unified-tools';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { render } from 'astro:content';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import { stripFootnotes } from '#lib/utils/text.ts';

async function createRenderMdxFunction() {
	const container = await AstroContainer.create();

	container.addServerRenderer({ name: 'mdx', renderer: mdxRenderer });

	return async function (
		entry: ComputedEntry<'locations' | 'pages' | 'posts'>,
		options?: ContainerRenderOptions,
	) {
		const { Content } = await render(entry);

		return await container.renderToString(Content, options);
	};
}

const feedSanitizeSchema = {
	...defaultSchema,
	// Feed readers ship no stylesheet, so CJK wrapper spans unwrap to plain text
	tagNames: [...(defaultSchema.tagNames ?? []), 'figure', 'figcaption'].filter(
		(tagName) => tagName !== 'span',
	),
};

function sanitizeFeedContent(contentHtml: string, shouldExcludeFootnotes: boolean) {
	return sanitizeHtml(
		shouldExcludeFootnotes ? stripFootnotes(contentHtml) : contentHtml,
		feedSanitizeSchema,
	);
}

export async function createRenderFeedContentFunction({
	shouldExcludeFootnotes,
}: {
	shouldExcludeFootnotes: boolean;
}) {
	const renderMdx = await createRenderMdxFunction();

	return async function renderFeedContent(entry: ComputedEntry<'locations' | 'posts'>) {
		const contentHtml = await renderMdx(entry, {
			locals: {
				isFeed: true, // This conditional controls the output of MDX components
			},
		});

		return sanitizeFeedContent(contentHtml, shouldExcludeFootnotes);
	};
}
