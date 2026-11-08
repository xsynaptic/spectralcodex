import type { RSSFeedItem } from '@astrojs/rss';

import type { SyndicationImage, SyndicationItem } from '#lib/syndication/syndication-item.ts';

// eslint-disable-next-line unicorn/prefer-https -- a namespace URI is an identifier; MRSS declares this one over http
export const mediaNamespace = 'http://search.yahoo.com/mrss/';

function escapeXml(text: string) {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

// Not `enclosure`, which carries no dimensions and which some aggregators download automatically
function getMediaContent({ alt, height, type, url, width }: SyndicationImage) {
	const attributes = `url="${escapeXml(url)}" medium="image" type="${type}" width="${String(width)}" height="${String(height)}"`;

	if (alt === '') return `<media:content ${attributes}/>`;

	return `<media:content ${attributes}><media:description type="plain">${escapeXml(alt)}</media:description></media:content>`;
}

export function getRssItem(item: SyndicationItem) {
	return {
		categories: item.tags,
		link: item.path,
		pubDate: item.dateUpdated ?? item.dateCreated,
		title: item.title,
		...(item.contentHtml ? { content: item.contentHtml } : {}),
		...(item.description ? { description: item.description } : {}),
		...(item.image ? { customData: getMediaContent(item.image) } : {}),
	} satisfies RSSFeedItem;
}
