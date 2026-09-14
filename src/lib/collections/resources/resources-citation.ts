import type { ResourceSource } from '#lib/collections/resources/resources-utils.ts';
import type { LanguageCode } from '#lib/i18n/i18n-types.ts';

import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getResourcePath } from '#lib/utils/routing.ts';

interface CitationFormatting {
	authorsDelimiter: string;
	delimiter: string;
	quoteEnd: string;
	quoteStart: string;
}

const CitationFormattingMap = {
	[LanguageCodeEnum.ChineseTraditional]: {
		authorsDelimiter: '，',
		delimiter: '，',
		quoteEnd: '》',
		quoteStart: '《',
	},
	[LanguageCodeEnum.English]: {
		authorsDelimiter: ' & ',
		delimiter: ', ',
		quoteEnd: '',
		quoteStart: '',
	},
	[LanguageCodeEnum.Japanese]: {
		authorsDelimiter: '、',
		delimiter: '、',
		quoteEnd: '』',
		quoteStart: '『',
	},
} as const satisfies Record<string, CitationFormatting>;

type CitationLanguage = keyof typeof CitationFormattingMap;

// Non-Latin scripts we hold citation punctuation for; add a formatting entry to support another
const citationLanguagesMultilingual = [
	LanguageCodeEnum.ChineseTraditional,
	LanguageCodeEnum.Japanese,
] as const;

export interface Citation {
	authors: string | undefined;
	delimiter: string;
	published: string | undefined;
	title: string;
}

interface CitationInput {
	authorNames: Array<string | undefined> | undefined;
	lang: CitationLanguage;
	publishedDate: string | undefined;
	publishedDetails: string | undefined;
	publisher: string | undefined;
	title: string;
}

export function buildSourceCitations(source: ResourceSource) {
	return {
		multilingual: buildMultilingualCitation(source),
		primary: buildPrimaryCitation(source),
		url:
			'id' in source && 'showPage' in source
				? getResourcePath(source.id, source.showPage)
				: undefined,
	};
}

// Publisher, date and details all share the language's delimiter, so they collapse into one run
export function formatCitation({
	authorNames,
	lang,
	publishedDate,
	publishedDetails,
	publisher,
	title,
}: CitationInput): Citation {
	const formatting = CitationFormattingMap[lang];

	const names = authorNames?.filter((name) => name !== undefined) ?? [];
	const publishedParts = [publisher, publishedDate, publishedDetails].filter(
		(part) => part !== undefined,
	);

	return {
		authors: names.length > 0 ? names.join(formatting.authorsDelimiter) : undefined,
		delimiter: formatting.delimiter,
		published: publishedParts.length > 0 ? publishedParts.join(formatting.delimiter) : undefined,
		title: `${formatting.quoteStart}${title}${formatting.quoteEnd}`,
	};
}

function buildMultilingualCitation(source: ResourceSource) {
	const title = getPrimaryContent(source, 'title');
	const publisher = getPrimaryContent(source, 'publisher');
	const publishedDetails = getPrimaryContent(source, 'publishedDetails');

	// Regional variants such as `zh-Hans` share the base language's punctuation
	const lang = citationLanguagesMultilingual.find(
		(citationLang) =>
			title?.lang.startsWith(citationLang) || publisher?.lang.startsWith(citationLang),
	);

	if (!lang || !title?.value) return;

	return {
		lang: title.lang satisfies LanguageCode,
		...formatCitation({
			authorNames: source.authors?.map((author) => author[`name_${lang}`]),
			lang,
			publishedDate: source.publishedDate,
			publishedDetails: publishedDetails?.value,
			publisher: publisher?.value,
			title: title.value,
		}),
	};
}

function buildPrimaryCitation(source: ResourceSource) {
	if (!source.title) return;

	return formatCitation({
		authorNames: source.authors?.map((author) => author.name),
		lang: LanguageCodeEnum.English,
		publishedDate: source.publishedDate,
		publishedDetails: source.publishedDetails,
		publisher: source.publisher,
		title: source.title,
	});
}

function getPrimaryContent(source: ResourceSource, prop: string) {
	return getMultilingualContent({ data: source, prop })?.primary;
}
