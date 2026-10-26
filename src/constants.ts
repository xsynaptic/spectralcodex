export const contentExcerptIdentifier = '<!-- more -->';

export const hashShortLength = 12;

export const backlinksDisplayCountMinimum = 3;

// The nearby distance limit is in kilometers
export const locationsNearbyCountLimit = 12;
export const locationsNearbyDistanceLimit = 10;

export const mapGeometryCoordinatesPrecision = 6;

export const mapBacklinkDistanceLimitKm = 20;

export const atlasRegionId = 'taiwan';

export const mapDisplayRegionIds = new Set([
	'canada',
	'hong-kong',
	'taiwan',
	'thailand',
	'vietnam',
]);

export const mdxComponentFiles = {
	BuildStats: 'build-stats',
	Email: 'email',
	Hide: 'hide',
	Img: 'img',
	ImgGroup: 'img-group',
	Link: 'link',
	LocationsTable: 'locations-table',
	Map: 'map',
	More: 'more',
	Resource: 'resource',
} as const;

export const mdxComponents = Object.keys(mdxComponentFiles);

export const openGraphTwitterUsername = '@spectralcodex';

export const tailwindBreakpointSm = '40rem';
export const tailwindBreakpointMd = '48rem';
export const tailwindBreakpointContent = '60.25rem';
export const tailwindContentPaddingSm = '2rem';
export const tailwindContentPaddingMd = '4rem';

export const millisecondsPerDay = 86_400_000;
export const millisecondsPerHour = 3_600_000;

export const siteYearFounded = 2009;

export const siteTimezoneOffsetHours = 8;
