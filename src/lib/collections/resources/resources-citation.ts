import type { ResourceSource } from '#lib/collections/resources/resources-utils.ts';
import type { LanguageCode } from '#lib/i18n/i18n-types.ts';

import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getResourceUrl } from '#lib/utils/routing.ts';

interface CitationFormatting {
	authorsDelimiter: string;
	delimiter: string;
	quoteStart: string;
	quoteEnd: string;
}

const CitationFormattingMap = {
	[LanguageCodeEnum.English]: {
		authorsDelimiter: ' & ',
		delimiter: ', ',
		quoteStart: '',
		quoteEnd: '',
	},
	[LanguageCodeEnum.ChineseTraditional]: {
		authorsDelimiter: '，',
		delimiter: '，',
		quoteStart: '《',
		quoteEnd: '》',
	},
	[LanguageCodeEnum.Japanese]: {
		authorsDelimiter: '、',
		delimiter: '、',
		quoteStart: '『',
		quoteEnd: '』',
	},
} as const satisfies Record<string, CitationFormatting>;

type CitationLanguage = keyof typeof CitationFormattingMap;

// Non-Latin scripts we hold citation punctuation for; add a formatting entry to support another
const citationLanguagesMultilingual = [
	LanguageCodeEnum.ChineseTraditional,
	LanguageCodeEnum.Japanese,
] as const;

export interface Citation {
	delimiter: string;
	authors: string | undefined;
	title: string;
	published: string | undefined;
}

interface CitationInput {
	lang: CitationLanguage;
	title: string;
	authorNames: Array<string | undefined> | undefined;
	publisher: string | undefined;
	publishedDate: string | undefined;
	publishedDetails: string | undefined;
}

// Publisher, date and details all share the language's delimiter, so they collapse into one run
export function formatCitation({
	lang,
	title,
	authorNames,
	publisher,
	publishedDate,
	publishedDetails,
}: CitationInput): Citation {
	const formatting = CitationFormattingMap[lang];

	const names = authorNames?.filter((name) => name !== undefined) ?? [];
	const publishedParts = [publisher, publishedDate, publishedDetails].filter(
		(part) => part !== undefined,
	);

	return {
		delimiter: formatting.delimiter,
		authors: names.length > 0 ? names.join(formatting.authorsDelimiter) : undefined,
		title: `${formatting.quoteStart}${title}${formatting.quoteEnd}`,
		published: publishedParts.length > 0 ? publishedParts.join(formatting.delimiter) : undefined,
	};
}

function buildPrimaryCitation(source: ResourceSource) {
	if (!source.title) return;

	return formatCitation({
		lang: LanguageCodeEnum.English,
		title: source.title,
		authorNames: source.authors?.map((author) => author.name),
		publisher: source.publisher,
		publishedDate: source.publishedDate,
		publishedDetails: source.publishedDetails,
	});
}

function buildMultilingualCitation(source: ResourceSource) {
	const title = getMultilingualContent({ data: source, prop: 'title' })?.primary;
	const publisher = getMultilingualContent({ data: source, prop: 'publisher' })?.primary;
	const publishedDetails = getMultilingualContent({
		data: source,
		prop: 'publishedDetails',
	})?.primary;

	// Regional variants such as `zh-Hans` share the base language's punctuation
	const lang = citationLanguagesMultilingual.find(
		(citationLang) =>
			title?.lang.startsWith(citationLang) || publisher?.lang.startsWith(citationLang),
	);

	if (!lang || !title?.value) return;

	return {
		lang: title.lang satisfies LanguageCode,
		...formatCitation({
			lang,
			title: title.value,
			authorNames: source.authors?.map((author) => author[`name_${lang}`]),
			publisher: publisher?.value,
			publishedDate: source.publishedDate,
			publishedDetails: publishedDetails?.value,
		}),
	};
}

export function buildSourceCitations(source: ResourceSource) {
	return {
		url:
			'id' in source && 'showPage' in source
				? getResourceUrl(source.id, source.showPage)
				: undefined,
		primary: buildPrimaryCitation(source),
		multilingual: buildMultilingualCitation(source),
	};
}
