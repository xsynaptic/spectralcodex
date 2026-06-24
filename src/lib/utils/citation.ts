import type { CollectionEntry } from 'astro:content';

import type { LanguageCode } from '#lib/i18n/i18n-types.ts';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getContentUrl } from '#lib/utils/routing.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

// This is a subset of valid CSL JSON for a webpage
interface CitationItem {
	type: 'webpage';
	id: string;
	title: string;
	titleAdditional?: { lang: LanguageCode; value: string };
	author: Array<{ literal: string }>;
	issued: string;
	URL: string;
	'container-title': string;
	language: LanguageCode;
}

type CitableEntry = CollectionEntry<'locations' | 'posts'>;

function toIsoDate(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');

	return `${String(year)}-${month}-${day}`;
}

export function buildCitation(entry: CitableEntry): CitationItem {
	const t = getTranslations();

	const titleAdditional = getMultilingualContent({
		data: entry.data,
		prop: 'title',
	})?.primary;

	return {
		type: 'webpage',
		id: `${entry.collection}-${entry.id}`,
		title: entry.data.title,
		...(titleAdditional ? { titleAdditional } : {}),
		author: [{ literal: t('author.name') }],
		issued: toIsoDate(entry.data.dateCreated),
		URL: getContentUrl(entry.collection, entry.id),
		'container-title': t('site.title'),
		language: LanguageCodeEnum.English,
	};
}

export function formatCitationLine(item: CitationItem): string {
	const t = getTranslations();

	const authors = item.author.map((author) => author.literal).join(', ');
	const title = item.titleAdditional
		? formatStringTemplate(t('section.citation.titleMultilingual'), {
				title: item.title,
				titleAdditional: item.titleAdditional.value,
			})
		: item.title;

	return formatStringTemplate(t('section.citation.format'), {
		authors,
		title,
		container: item['container-title'],
		date: item.issued,
		url: item.URL,
	});
}

interface CslDateParts {
	'date-parts': [Array<number>];
}

function isoToDateParts(iso: string): CslDateParts | undefined {
	const [year, month, day] = iso.split('-').map(Number);

	if (!year) return;

	const parts: Array<number> = [year];

	if (month) parts.push(month);
	if (day) parts.push(day);

	return { 'date-parts': [parts] };
}

export function toCitationJson(item: CitationItem): string {
	const issued = isoToDateParts(item.issued);

	const cslItem: Record<string, unknown> = {
		type: item.type,
		id: item.id,
		title: item.title,
		author: item.author,
		URL: item.URL,
		'container-title': item['container-title'],
		language: item.language,
	};

	if (issued) cslItem.issued = issued;

	return JSON.stringify([cslItem]);
}
