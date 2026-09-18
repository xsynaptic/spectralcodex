import type { LanguageCode } from '#lib/i18n/i18n-types.ts';

import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { formatNumber, formatStringTemplate } from '#lib/utils/text.ts';

const defaultLanguage = LanguageCodeEnum.English;

// Type that requires the default language and makes others optional
type TranslationsRecord<T extends Record<string, string>> = Partial<
	Record<Exclude<LanguageCode, typeof defaultLanguage>, T>
> &
	Record<typeof defaultLanguage, T>;

// Note: this is a very basic implementation of a translations file
// It mostly serves to collection translatable strings in one place for future enhancement
const translationStrings = {
	[defaultLanguage]: {
		// Homepage
		'home.introduction': `Welcome to **Spectral Codex**, a digital garden, a travel journal, photography portfolio, and geospatial database curated by Alexander Synaptic. This site is completely ad-free and features no sponsored content, though you're welcome to support my work via [Patreon](https://www.patreon.com/spectralcodex) if you like what you find here. Read a little more [about my background and motivations](/about), or start browsing the collection!`,
		'home.overview': `Currently this project features {locationsCount} [locations](/locations) ({locationsWithImagesCount} with images), {postsCount} [posts](/posts), {regionsCount} [regions](/regions), {themesCount} [themes](/themes), {imagesCount} images, {linksExternalCount} outbound links, and {totalWordCount} words, mostly covering topics related to [Taiwan](/regions/taiwan). Gathered below are some of the better and more recent links from around the site to get you started...`,
		'home.recent.label': 'Recent Updates',
		'home.series': `Complete series of photo essays and field notes from some of the many road trips and bicycle journeys I've undertaken over the years, mostly around Taiwan. If you prefer more of a narrative structure to explore the many places documented on this site you might like to start here.`,
		'home.themes': `Many different themes are explored on this site, generally as a way of making sense of history and socioeconomic change. Each theme features posts, field notes about specific locations, and a map to help navigate the geospatial dimension of a subject. I recommend having at least a glance at my most ambitious project, an extensive overview of nearly 1,200 [movie theaters across Taiwan](/themes/taiwan-theaters).`,

		// Images
		'collection.images.labelPlural': 'Images',
		'collection.images.labelSingular': 'Image',
		'collection.images.metadata.aperture.label': 'Aperture',
		'collection.images.metadata.cameraModel.label': 'Camera',
		'collection.images.metadata.dateCreated.label': 'Date Captured',
		'collection.images.metadata.download.label': 'Download',
		'collection.images.metadata.ev.label': 'EV',
		'collection.images.metadata.exposureValue.label': 'Exposure Value',
		'collection.images.metadata.focalLength.label': 'Focal Length',
		'collection.images.metadata.iso.label': 'ISO',
		'collection.images.metadata.label': 'Image Metadata: {title}',
		'collection.images.metadata.lensModel.label': 'Lens',
		'collection.images.metadata.shutterSpeed.label': 'Shutter Speed',
		'collection.images.metadata.title': 'Image Metadata',

		// Locations
		'collection.locations.description': `Each entry in this section contains information about a specific point of interest, often cultural attractions or historic sites, as well as geospatial data and outbound links to more information.`,
		'collection.locations.labelPlural': 'Locations',
		'collection.locations.labelSingular': 'Location',

		// Pages
		'collection.pages.labelPlural': 'Pages',
		'collection.pages.labelSingular': 'Page',

		// Posts
		'collection.posts.description': `The posts section primarily features long-form content: photo essays and galleries, road trip reports, geospatial narratives, and other writing forming the connective tissue between the other sections of this site. Posts are presented in reverse chronological order, with the most recent posts appearing at the top, adhering to the general principles of old-fashioned blogging.`,
		'collection.posts.labelPlural': 'Posts',
		'collection.posts.labelSingular': 'Post',

		// Regions
		'collection.regions.depth.1.labelChildren': 'Regions',
		'collection.regions.depth.1.labelSiblings': 'Other Countries',
		'collection.regions.depth.2.labelChildren': 'Subregions',
		'collection.regions.depth.2.labelSiblings': 'Other Regions',
		'collection.regions.depth.3.labelChildren': 'Subregions',
		'collection.regions.depth.3.labelSiblings': 'Other Regions',
		'collection.regions.description': `This section features posts and locations by region, from the level of entire countries down to local administrative districts in some cases. The vast majority of content on this site focuses on [Taiwan](/regions/taiwan), so you'll probably want to check that out if you're a first-time visitor.`,
		'collection.regions.labelPlural': 'Regions',
		'collection.regions.labelSingular': 'Region',

		// Resources
		'collection.resources.description':
			'Featured websites, blogs, and online resources that have informed or documented content on this site. Some entries also include maps generated from content cross-referenced in this project.',
		'collection.resources.entryCount.label': 'Entry Count',
		'collection.resources.homepage.label': 'Visit Homepage',
		'collection.resources.labelPlural': 'Resources',
		'collection.resources.labelSingular': 'Resource',
		'collection.resources.showPage.label': 'Resource Index',

		// Series
		'collection.series.description': `This section features content organized into series, mostly relating to road trips I've taken over the years. Several of the larger series are complete, but many of the smaller ones are a patchwork of unfinished journal entries.`,
		'collection.series.labelPlural': 'Series',
		'collection.series.labelSingular': 'Series',

		// Themes
		'collection.themes.description':
			'This site explores numerous themes, many of them overlapping, from history and culture through to art and architecture.',
		'collection.themes.labelPlural': 'Themes',
		'collection.themes.labelSingular': 'Theme',

		// Content
		'content.meta.backlinks.label.one': '{count} Backlink',
		'content.meta.backlinks.label.other': '{count} Backlinks',
		'content.meta.dateUpdated.label': 'Last updated',
		'content.meta.entries.label.one': '{count} Entry',
		'content.meta.entries.label.other': '{count} Entries',
		'content.meta.imageFeatured.label': 'Photo:',
		'content.meta.wordCount.label': 'Word count',
		'content.more.label': 'Read more',
		'content.redacted.label': 'redacted',

		// Content sections
		'section.author': 'Author',
		'section.backlinks': 'Backlinks',
		'section.content': 'Content',
		'section.content.locations': 'Featured By',
		'section.dateRecorded': 'Recorded On',
		'section.heritage': 'Heritage Designation',
		'section.itemsList': 'More',
		'section.links': 'Links',
		'section.links.platform.label': '{platform}: {title}',
		'section.locationsNearby': 'Nearby Locations',
		'section.map': 'Map',
		'section.map.label': 'Map of {title}',
		'section.map.loading': 'Loading map',
		'section.similar': 'Similar Content',
		'section.sources': 'Sources',
		'section.webmentions': 'Webmentions',

		// Webmentions
		'webmentions.bookmarks': 'Bookmarks',
		'webmentions.likes': 'Likes',
		'webmentions.mentions': 'Mentions',
		'webmentions.replies': 'Replies',
		'webmentions.reposts': 'Reposts',

		// Locations
		'locations.address.label': 'Address',
		'locations.status.vanished': 'Vanished',
		'locations.unit.km': '{distance} km',

		// Terms
		'terms.related.children.label': 'Subterms',
		'terms.related.siblings.label': 'Other Terms',

		// Chronology
		'chronology.activity.aria':
			'Activity for {year}: {created} created, {updated} updated, {visited} visited',
		'chronology.activity.label': 'Activity',
		'chronology.created.label': 'Created',
		'chronology.index.description':
			'Fieldwork and publishing on this site, year by year. Select a year for the monthly view.',
		'chronology.index.label': 'Index',
		'chronology.index.title': 'Chronology',
		'chronology.monthly.description': 'Fieldwork and publishing during {date}.',
		'chronology.monthly.title': 'Chronology: {date}',
		'chronology.updated.label': 'Updated',
		'chronology.visited.label': 'Visited',
		'chronology.yearly.description': 'Fieldwork and publishing across {date}, month by month.',
		'chronology.yearly.label': 'Years',
		'chronology.yearly.newer': 'Newer: {year}',
		'chronology.yearly.older': 'Older: {year}',
		'chronology.yearly.select.label': 'Go to year',
		'chronology.yearly.select.placeholder': 'Year',
		'chronology.yearly.title': 'Chronology: {date}',

		// Pagination
		'pagination.next': 'Next',
		'pagination.nextPage': 'Next page',
		'pagination.previous': 'Previous',
		'pagination.previousPage': 'Previous page',

		// Parts
		'parts.textSeparatedList.more': '{count} more',

		// Activity graph
		'activityGraph.tooltip.one': '{count} event: {date}',
		'activityGraph.tooltip.other': '{count} events: {date}',

		// Carousel
		'carousel.label': '{title} images',
		'carousel.nav.next': 'Next image',
		'carousel.nav.previous': 'Previous image',
		'carousel.roledescription': 'carousel',
		'carousel.slide.label': '{current} of {total}',
		'carousel.slide.roledescription': 'slide',

		// Objectives
		'objectives.description':
			'This is a custom map tracking points in the geospatial database that still require verification and documentation. It is not intended for external consumption.',
		'objectives.title': 'Objectives',

		// Build stats
		'buildStats.chart.duration.aria': 'Build duration over time',
		'buildStats.chart.duration.label': 'Build duration',
		'buildStats.chart.pages.aria': 'Pages built over time',
		'buildStats.chart.pages.label': 'Pages built',
		'buildStats.empty': 'No data available yet.',
		'buildStats.tooltip.duration': 'This build',
		'buildStats.tooltip.median': 'Median',
		'buildStats.tooltip.pages': 'Pages',
		'buildStats.trend.label': 'median',

		// Notices
		'notice.danger': `**Warning**: this location is abandoned, hazardous, or otherwise neglected and may be unsafe and even dangerous! Exercise appropriate precautions when visiting.`,
		'notice.quality': `**Note**: this entry contains only basic information and may be out of date, inaccurate, or even wrong. Additional research is strongly recommended.`,
		'notice.severity.error': 'Error:',
		'notice.severity.info': 'Info:',
		'notice.severity.success': 'Success:',
		'notice.severity.warning': 'Warning:',
		'notice.vanished': `**Note**: this location has vanished. Any information presented here is only for reference.`,

		// Site
		'site.breadcrumbs.label': 'Breadcrumb Navigation',
		'site.colophon.label': 'Colophon',
		'site.description':
			'Photo essays, road trips, and a geospatial database with a particular emphasis on the history and culture of Taiwan.',
		'site.footer.buildStats.label': 'Build Stats',
		'site.footer.copyright.label': '©{year}–{currentYear}',
		'site.footer.feed.label': 'RSS Feed',
		'site.footer.powered.label': 'Powered by',
		'site.footer.sourceCode.label': 'Source Code',
		'site.footer.updated.label': 'Site updated on',
		'site.mode.toggle.dark.label': 'Switch to dark mode',
		'site.mode.toggle.light.label': 'Switch to light mode',
		'site.navigation.footer.label': 'Footer',
		'site.navigation.header.label': 'Header',
		'site.navigation.header.submenu.label': 'Submenu for {title}',
		'site.pagination.counter.label': 'Page {current} of {total}',
		'site.pagination.label': 'Pagination',
		'site.pagination.pageNumber.label': 'Page {page}',
		'site.pagination.select.label': 'Go to page',
		'site.pagination.select.submit': 'Go',
		'site.pagination.select.total': 'of {total}',
		'site.search.placeholder': 'Search...',
		'site.search.shortcut.description': 'open search',
		'site.search.toggle.label': 'Open search',
		'site.search.toggle.title': 'Search',
		'site.skip.label': 'Skip to content',
		'site.subtitle': 'An evolving journal of synchronicity and connection.',
		'site.title': 'Spectral Codex',
		'site.topButton.label': 'Back to top',

		// Menu items
		'navigation.about.label': 'About',
		'navigation.bluesky.label': 'Bluesky',
		'navigation.chronology.label': 'Chronology',
		'navigation.contact.label': 'Contact',
		'navigation.facebook.label': 'Facebook',
		'navigation.flickr.label': 'Flickr',
		'navigation.instagram.label': 'Instagram',
		'navigation.mastodon.label': 'Mastodon',
		'navigation.patreon.label': 'Patreon',
		'navigation.terms.label': 'Terms of Use',
		'navigation.threads.label': 'Threads',

		// Author
		'author.description': `I am a web application developer, photojournalist, urban explorer, and history enthusiast passionate about the open web and documenting my experiences on this planet. This project was founded in the early 2010s and has evolved into a sort of personal Wikipedia of places that interest me (and often the photographs I've taken there). I'm originally from Toronto, Canada, but spend most of my time residing in [Taiwan](/regions/taiwan/).`,
		'author.name': 'Alexander Synaptic',
		'author.photo.alt': 'Profile photo of Alexander Synaptic, founder of Spectral Codex',
		'author.role': 'Curator',

		// 404
		'notFound.description': `Hmm, that's strange. There doesn't appear to be anything at this address. Try something else or try the search function above.`,
		'notFound.suggestions': 'Perhaps you were looking for one of these:',
		'notFound.title': 'Page Not Found',
	},
	[LanguageCodeEnum.ChineseSimplified]: {},
	[LanguageCodeEnum.ChineseTraditional]: {
		'notice.danger': `**警告**：此處已廢棄或長期無人管理，可能存在潛在危險。造訪時請務必提高警覺，並做好相關安全防護措施。`,
		'notice.quality': `**說明**：本條目僅提供基礎資訊，內容可能過時、未經查證，甚至有誤。建議進一步查閱相關資料，以確認資訊的正確性。`,
		'notice.vanished': `**提醒**：此地點已消失，本文僅供參考用途。`,
	},
	[LanguageCodeEnum.Japanese]: {},
	[LanguageCodeEnum.Korean]: {},
	[LanguageCodeEnum.Thai]: {},
	[LanguageCodeEnum.Vietnamese]: {},
} as const satisfies TranslationsRecord<Record<string, string>>;

type PluralValues = Record<string, number | string> & { langCode?: LanguageCode };

// Get all possible translation keys across ALL languages
type TranslationKey = {
	[L in keyof typeof translationStrings]: keyof (typeof translationStrings)[L];
}[keyof typeof translationStrings];

// Plural forms are keyed by CLDR category; `.other` is the one required form, so it anchors this type
type TranslationKeyPlural<K extends string = TranslationKey> = K extends `${infer Base}.other`
	? Base
	: never;

const pluralRulesCache = new Map<LanguageCode, Intl.PluralRules>();

export function getTranslations() {
	function t(key: TranslationKey, langCode: LanguageCode = defaultLanguage) {
		const langTranslations = translationStrings[langCode] as Partial<
			Record<TranslationKey, string>
		>;
		if (Object.hasOwn(langTranslations, key) && langTranslations[key] !== undefined) {
			return langTranslations[key];
		}

		const defaultTranslations = translationStrings[defaultLanguage] as Record<
			TranslationKey,
			string
		>;
		return defaultTranslations[key];
	}

	// Remaining placeholders ride alongside `langCode`; `{count}` comes from the count itself
	function tPlural(
		key: TranslationKeyPlural,
		count: number,
		{ langCode = defaultLanguage, ...values }: PluralValues = {},
	) {
		return formatStringTemplate(t(resolvePluralKey(key, count, langCode), langCode), {
			...values,
			count: formatNumber({ locales: langCode, number: count }),
		});
	}

	return Object.assign(t, { plural: tPlural });
}

function getPluralCategory(count: number, langCode: LanguageCode) {
	let pluralRules = pluralRulesCache.get(langCode);

	if (!pluralRules) {
		pluralRules = new Intl.PluralRules(langCode);
		pluralRulesCache.set(langCode, pluralRules);
	}

	return pluralRules.select(count);
}

// Languages carrying only `.other` still resolve; English anchors the fallback
function resolvePluralKey(key: TranslationKeyPlural, count: number, langCode: LanguageCode) {
	const categoryKey = `${key}.${getPluralCategory(count, langCode)}`;
	const hasCategoryKey = [langCode, defaultLanguage].some((code) =>
		Object.hasOwn(translationStrings[code], categoryKey),
	);

	return (hasCategoryKey ? categoryKey : `${key}.other`) as TranslationKey;
}
