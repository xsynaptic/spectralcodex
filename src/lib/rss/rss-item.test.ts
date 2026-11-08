import { getRssString } from '@astrojs/rss';
import { describe, expect, test } from 'vitest';

import type { SyndicationItem } from '#lib/syndication/syndication-item.ts';

import { getRssItem, mediaNamespace } from '#lib/rss/rss-item.ts';

const dateCreated = new Date('2026-10-01T16:00:00Z');
const dateUpdated = new Date('2026-10-29T16:00:00Z');

const itemFull = {
	contentHtml: '<p>Body</p>',
	dateCreated,
	dateUpdated,
	description: 'After dark on Shanhang Street.',
	image: {
		alt: 'Lanterns & incense <at dusk>',
		height: 800,
		type: 'image/jpeg',
		url: 'https://img.example.com/taiwan/lukang-wuze-temple-1-1200x800.jpg',
		width: 1200,
	},
	path: '/lukang-wuze-temple/',
	tags: ['Temple Culture in Taiwan', 'Lukang', 'Changhua', 'Taiwan'],
	title: 'Lukang Wuze Temple (鹿港杉行街武澤宮)',
} satisfies SyndicationItem;

const itemBare = {
	dateCreated,
	path: '/bare-entry/',
	tags: [],
	title: 'Bare Entry',
} satisfies SyndicationItem;

async function renderItem(item: SyndicationItem) {
	const xml = await getRssString({
		description: 'Fixture feed',
		items: [getRssItem(item)],
		site: 'https://example.com',
		title: 'Fixture',
		xmlns: { media: mediaNamespace },
	});

	return /<item>[\s\S]*<\/item>/.exec(xml)?.[0] ?? '';
}

describe('getRssItem', () => {
	test('tags become categories in order', async () => {
		const item = await renderItem(itemFull);

		expect(
			[...item.matchAll(/<category>([^<]*)<\/category>/g)].map(([, tag]) => tag),
		).toStrictEqual(itemFull.tags);
	});

	test('the image becomes media content carrying its type, dimensions and escaped alt', async () => {
		const item = await renderItem(itemFull);

		expect(item).toContain(
			`<media:content url="${itemFull.image.url}" medium="image" type="image/jpeg" width="1200" height="800">`,
		);
		expect(item).toContain(
			'<media:description type="plain">Lanterns &amp; incense &lt;at dusk&gt;</media:description>',
		);
	});

	test('an image with no alt carries no description', async () => {
		const item = await renderItem({ ...itemFull, image: { ...itemFull.image, alt: '' } });

		expect(item).toContain('<media:content ');
		expect(item).not.toContain('<media:description');
	});

	test('an item without an image or tags emits neither', async () => {
		const item = await renderItem(itemBare);

		expect(item).not.toContain('<media:content');
		expect(item).not.toContain('<category>');
	});

	test('the publication date is the update when there is one', async () => {
		expect(await renderItem(itemFull)).toContain(`<pubDate>${dateUpdated.toUTCString()}</pubDate>`);
		expect(await renderItem(itemBare)).toContain(`<pubDate>${dateCreated.toUTCString()}</pubDate>`);
	});
});
