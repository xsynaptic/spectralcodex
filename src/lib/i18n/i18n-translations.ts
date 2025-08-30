import type { LanguageCode } from '#lib/i18n/i18n-types.ts';

import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';

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
		'index.introduction': `Welcome to the latest incarnation of **Spectral Codex**, a personal website blending aspects of a traditional blog, photography portfolio, travel journal, and geospatial database. You can read more about me [here](/about), or start browsing the collection! Gathered here are some of the better and more recent links from around the site to get you started...`,
		'index.recent.label': 'Recent Updates',
		'index.themes': `Many different themes are explored on this site, generally as a way of making sense of history and socioeconomic change. Each theme features posts, field notes about specific locations, and a map to help navigate the geospatial dimension of a subject. I recommend having at least a glance at my most ambitious project, an extensive overview of more than 1,000 [movie theaters in Taiwan](/themes/taiwan-theaters).`,
		'index.series': `Complete series of photo essays and field notes from some of the many road trips and bicycle journeys I've undertaken over the years, mostly around Taiwan. If you prefer more of a narrative structure to explore the many places documented on this site you might like to start here.`,

		// Ephemera
		'collection.ephemera.labelSingular': 'Ephemera',
		'collection.ephemera.labelPlural': 'Ephemera',
		'collection.ephemera.description': `This section gathers more casual content: photo galleries, opinion pieces, administrative announcements, and other miscellaneous stuff. Think of this as the old-fashioned blog within the wider site, much less polished and generally less serious.`,

		// Images
		'collection.images.labelSingular': 'Image',
		'collection.images.labelPlural': 'Images',
		'collection.images.metadata.title': 'Image Metadata',
		'collection.images.metadata.close.title': 'Close Image Metadata',
		'collection.images.metadata.dateCreated.label': 'Date Captured',
		'collection.images.metadata.cameraModel.label': 'Camera',
		'collection.images.metadata.lensModel.label': 'Lens',
		'collection.images.metadata.aperture.label': 'Aperture',
		'collection.images.metadata.shutterSpeed.label': 'Shutter Speed',
		'collection.images.metadata.focalLength.label': 'Focal Length',
		'collection.images.metadata.iso.label': 'ISO',
		'collection.images.metadata.exposureValue.label': 'Exposure Value',
		'collection.images.metadata.ev.label': 'EV',
		'collection.images.metadata.sourceDimensions.label': 'Original Size',

		// Locations
		'collection.locations.labelSingular': 'Location',
		'collection.locations.labelPlural': 'Locations',
		'collection.locations.description': `Every entry in this section contains information about a specific point of interest, often cultural attractions or historic sites, as well as geospatial data and links to more information.`,

		// Pages
		'collection.pages.labelSingular': 'Page',
		'collection.pages.labelPlural': 'Pages',

		// Posts
		'collection.posts.labelSingular': 'Post',
		'collection.posts.labelPlural': 'Posts',
		'collection.posts.description': `Feature-length and long-form content, primarily photo essays, road trip journals, and geospatial narratives, with occasional forays into other forms of more in-depth writing.`,

		// Regions
		'collection.regions.labelSingular': 'Region',
		'collection.regions.labelPlural': 'Regions',
		'collection.regions.description': `This section features posts and locations by region, from the level of entire countries down to local administrative districts in some cases. The vast majority of content on this site focuses on [Taiwan](/regions/taiwan), so you'll probably want to check that out if you're a first-time visitor.`,
		'collection.regions.depth.1.labelChildren': 'Regions',
		'collection.regions.depth.1.labelSiblings': 'Other Countries',
		'collection.regions.depth.2.labelChildren': 'Subregions',
		'collection.regions.depth.2.labelSiblings': 'Other Regions',
		'collection.regions.depth.3.labelChildren': 'Subregions',
		'collection.regions.depth.3.labelSiblings': 'Other Regions',

		// Series
		'collection.series.labelSingular': 'Series',
		'collection.series.labelPlural': 'Series',
		'collection.series.description': `This section features content organized into series, mostly relating to road trips I've taken over the years. Several of the larger series are complete, but many of the smaller ones are a patchwork of unfinished journal entries.`,

		// Themes
		'collection.themes.labelSingular': 'Theme',
		'collection.themes.labelPlural': 'Themes',
		'collection.themes.description':
			'This site explores numerous themes, many of them overlapping, from history and culture through to art and architecture.',

		// Content
		'content.meta.dateUpdated.label': 'updated on',
		'content.meta.locations.label': 'Mapped locations',
		'content.meta.wordCount.label': 'Word count',
		'content.meta.imageFeatured.label': 'Photo:',
		'content.more.label': 'Read more',

		// Content sections
		'content.section.content': 'Content',
		'content.section.links.sources': 'Links & Sources',
		'content.section.links': 'Links',
		'content.section.sources': 'Sources',
		'content.section.heritage': 'Heritage Status',
		'content.section.map': 'Map',
		'content.section.locationsNearby': 'Nearby Locations',
		'content.section.backlinks': 'Connections',
		'content.section.related': 'Related Content',
		'content.section.dateVisited': 'Visitation Log',

		// Locations
		'locations.status.demolished': 'Demolished',
		'locations.unit.km': 'km',
		'locations.address.label': 'Address',

		// Terms
		'terms.related.children.label': 'Subterms',
		'terms.related.siblings.label': 'Other Terms',

		// Timeline
		'timeline.title': 'Timeline',
		'timeline.overview.description': 'High level overview of all content on this site by year.',
		'timeline.yearly.description': 'Monthly content archives for the year %s.',
		'timeline.monthly.description': 'Content archives for %s.',
		'timeline.stats.title': 'Stats',
		'timeline.stats.images.label': 'Images',

		// Pagination
		'pagination.next': 'Next',
		'pagination.previous': 'Previous',

		// Objectives
		'objectives.title': 'Objectives',
		'objectives.description':
			'This is a custom map tracking points in the geospatial database that still require verification and documentation. It is not meant for external consumption.',

		// Notices
		'notice.danger': `**Warning**: this location is abandoned, hazardous, or otherwise neglected and may be unsafe and even dangerous! Exercise appropriate precautions when visiting.`,
		'notice.demolished': `**Note**: this location has been demolished and no longer exists. Any information presented here is only for reference.`,
		'notice.quality': `**Note**: this entry contains only basic information and may be out of date, inaccurate, or even wrong. Additional research is strongly recommended.`,

		// Site
		'site.title': 'Spectral Codex',
		'site.subtitle': 'An evolving journal of synchronicity and connection.',
		'site.description':
			'Photo essays, road trips, and a geospatial database with a particular emphasis on the history and culture of Taiwan.',
		'site.skip.label': 'Skip to content',
		'site.footer.powered.label': 'Powered by',
		'site.footer.updated.label': 'Site updated on',
		'site.breadcrumbs.label': 'Breadcrumb Navigation',
		'site.colophon.label': 'Colophon',
		'site.menu.footer.label': 'Footer Navigation',
		'site.menu.header.label': 'Header Navigation',
		'site.menu.header.submenu.label': 'Submenu for %s',
		'site.mode.toggle.label': 'Toggle mode',
		'site.mode.toggle.dark.label': 'Dark mode',
		'site.mode.toggle.light.label': 'Light mode',
		'site.mode.toggle.system': 'System mode',
		'site.pagination.label': 'Pagination',
		'site.pagination.pageNumber.label': 'Page %s',

		// Menu items
		'menu.timeline.label': 'Timeline',
		'menu.about.label': 'About',
		'menu.contact.label': 'Contact',
		'menu.terms.label': 'Terms of Use',
		'menu.feed.label': 'RSS Feed',
		'menu.bluesky.label': 'Bluesky',
		'menu.facebook.label': 'Facebook',
		'menu.flickr.label': 'Flickr',
		'menu.instagram.label': 'Instagram',
		'menu.mastodon.label': 'Mastodon',
		'menu.patreon.label': 'Patreon',

		// 404
		'404.title': 'Error 404: Page Not Found',
		'404.description': `Sorry, there doesn't seem to be anything at this URL! Please try another path.`,
	},
	[LanguageCodeEnum.ChineseTraditional]: {
		'notice.danger': `**警告**：此地點已遭廢棄、荒廢，或長期無人管理，存在潛在危險。造訪時請務必提高警覺並採取適當防範措施。`,
		'notice.demolished': `**提醒**：此地點已遭拆除，不再存在。本文僅供參考用途。`,
		'notice.quality': `**說明**：本條目僅提供基礎資訊，內容可能過時、未經查證，甚至有所錯誤。建議進一步查閱相關資料以獲得更準確的理解。`,
	},
	[LanguageCodeEnum.ChineseSimplified]: {},
	[LanguageCodeEnum.Japanese]: {},
	[LanguageCodeEnum.Korean]: {},
	[LanguageCodeEnum.Vietnamese]: {},
	[LanguageCodeEnum.Thai]: {},
} as const satisfies TranslationsRecord<Record<string, string>>;

// Get all possible translation keys across ALL languages
type TranslationKey = {
	[L in keyof typeof translationStrings]: keyof (typeof translationStrings)[L];
}[keyof typeof translationStrings];

export function getTranslations() {
	return function t(key: TranslationKey, langCode: LanguageCode = defaultLanguage) {
		const langTranslations = translationStrings[langCode] as Partial<
			Record<TranslationKey, string>
		>;
		const defaultTranslations = translationStrings[defaultLanguage] as Record<
			TranslationKey,
			string
		>;

		if (key in langTranslations && langTranslations[key] !== undefined) {
			return langTranslations[key];
		}
		return defaultTranslations[key];
	};
}
