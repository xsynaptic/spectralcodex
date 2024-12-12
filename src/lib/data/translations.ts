export const languages = {
	en: 'English',
	zh: '中文',
};

export const defaultLanguage = 'en';

// Note: this is a very basic implementation of a translations file
// It mostly serves to collection translatable strings in one place for future enhancement
export const translations = {
	en: {
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
		'collection.images.metadata.dateCaptured.label': 'Date Captured',
		'collection.images.metadata.cameraModel.label': 'Camera',
		'collection.images.metadata.lensModel.label': 'Lens',
		'collection.images.metadata.aperture.label': 'Aperture',
		'collection.images.metadata.shutterSpeed.label': 'Shutter Speed',
		'collection.images.metadata.focalLength.label': 'Focal Length',
		'collection.images.metadata.iso.label': 'ISO',
		'collection.images.metadata.exposureValue.label': 'Exposure Value',
		'collection.images.metadata.ev.label': 'EV',
		'collection.images.metadata.sourceDimensions.label': 'Source Dimensions',

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
		'notice.danger': `**Warning**: this site may be abandoned, under restoration, or otherwise poorly maintained and monitored. The information on this page may also be inaccurate or out of date. Exercise appropriate precautions when visiting!`,
		'notice.demolished': `**Warning**: this location has been demolished and no longer exists. Any geospatial details presented here are only for reference.`,
		'notice.quality': `**Warning**: this entry is marked as low-quality. More information may be found by searching the web for the name of the place. Location info and other details may not be accurate.`,

		// Site
		'site.title': 'Spectral Codex',
		'site.subtitle': 'An evolving journal of synchronicity and connection.',
		'site.description':
			'Photo essays, road trips, and a geospatial database with a particular emphasis on the history and culture of Taiwan.',
		'site.skip.label': 'Skip to content',
		'site.footer.powered.label': 'Human-generated and powered by',
		'site.footer.updated.label': 'Site updated on',
		'site.breadcrumbs.aria.label': 'Breadcrumb Navigation',

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
} as const satisfies Record<typeof defaultLanguage, Record<string, string>>;
