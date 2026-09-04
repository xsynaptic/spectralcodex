// An arbitrary identified for the "more" excerpt, used internally
export const contentExcerptIdentifier = '<!-- more -->';

// Hashes that surface in endpoint URLs and rendered markup are truncated to this length
export const hashShortLength = 12;

export const imageLowQualityValue = 70 as const;
export const imageHeroQualityValue = 70 as const;
export const imageHighQualityValue = 85 as const;
export const imageLowQualityFormat = 'webp' as const;
export const imageHeroQualityFormat = 'webp' as const;
export const imageHighQualityFormat = 'jpg' as const;

// Region and theme subtitles only show a connection count once it means something
export const backlinksDisplayCountMinimum = 3;

// Max number of locations returned and maximum distance in kilometers
export const locationsNearbyCountLimit = 20;
export const locationsNearbyDistanceLimit = 10;

// Maps at or under this many locations inline their points instead of fetching the shared directory
// Counts locations, not features; multi-point locations expand to several features
// Sized so nearby maps (target + up to locationsNearbyCountLimit neighbors) always inline
export const mapSourceInlineLimit = locationsNearbyCountLimit + 1;

// Limit precision of coordinate data; may be superseded by Turf's truncate function
export const mapGeometryCoordinatesPrecision = 6;

// Public folder for map division data
export const mapDivisionsDataPath = 'divisions';

// Root regions (self or ancestor) whose pages display maps; content policy, edit deliberately
export const mapDisplayRegionIds = new Set([
	'taiwan',
	'hong-kong',
	'thailand',
	'vietnam',
	'canada',
]);

export const mdxComponents = [
	'Email',
	'Hide',
	'Img',
	'ImgGroup',
	'Link',
	'LocationsTable',
	'Map',
	'More',
	'Resource',
];

// How many fallback images are there? These should already be located in the `/public` folder
export const openGraphImageFallbackCount = 5;
export const openGraphImageFallbackPrefix = 'og-image';

// Generate high DPI Open Graph images
export const openGraphImageDensity = 2;

// Not sure how useful this is nowadays
export const openGraphTwitterUsername = '@spectralcodex';

// Tailwind CSS V4 breakpoints and spacing
export const tailwindBreakpointSm = '40rem';
export const tailwindBreakpointMd = '48rem'; // Note: large is 64rem
export const tailwindBreakpointContent = '60.25rem'; // This is a custom setting
export const tailwindContentPaddingSm = '2rem'; // 32px equivalent
export const tailwindContentPaddingMd = '4rem'; // 64px equivalent

// Time
export const millisecondsPerDay = 86_400_000;
export const millisecondsPerHour = 3_600_000;

// A string representing the year the site was founded; will default to the current year
export const siteYearFounded = 2009;

// Wall-clock content dates belong to this timezone; used to anchor them to real instants
export const siteTimezoneOffsetHours = 8;
