/**
 * Content collections and schemas
 */
// Path to content from the root; defaults *e.g.* `./packages/content-demo/collections`
export const CONTENT_COLLECTIONS_PATH = './packages/content/collections';

// An arbitrary identified for the "more" excerpt, used internally
export const CONTENT_EXCERPT_IDENTIFIER = 'more';

// Set to "true" to log missing Link component IDs
export const CONTENT_LINKS_MISSING_ID_LOG = true as boolean;

/**
 * Image configuration
 */
// Image quality for all transformations
export const IMAGE_QUALITY = 88 as const;

// Image format for all transformations
export const IMAGE_FORMAT = 'jpg' as const;

/**
 * Location configuration
 */
// Max number of locations returned
export const LOCATIONS_NEARBY_COUNT_LIMIT = 20;

// Maximum distance in kilometers for nearby locations
export const LOCATIONS_NEARBY_DISTANCE_LIMIT = 10; // km

/**
 * Map configuration
 */
// Limit precision of coordinate data; may be superseded by Turf's truncate function
export const MAP_GEOMETRY_COORDINATES_PRECISION = 6;

// Public folder for map division data
export const MAP_DIVISION_DATA_PATH = 'divisions';

/**
 * MDX
 */
// Strip these MDX components from SEO descriptions and when generating word counts
export const MDX_COMPONENTS_TO_STRIP = ['Img', 'ImgGroup', 'Map', 'More'];

/**
 * Open Graph config
 */
// How many fallback images are there? These should already be located in the `/public` folder
export const OPEN_GRAPH_IMAGE_FALLBACK_COUNT = 5;
export const OPEN_GRAPH_IMAGE_FALLBACK_PREFIX = 'og-image';

// Generate high DPI Open Graph images
export const OPEN_GRAPH_IMAGE_DENSITY = 2;

// Not sure how useful this is nowadays
export const OPEN_GRAPH_TWITTER_USERNAME = '@spectralcodex';

/**
 * Tailwind CSS V4 breakpoints and spacing
 */
export const TAILWIND_BREAKPOINT_SM = '40rem';
export const TAILWIND_BREAKPOINT_MD = '48rem';
export const TAILWIND_BREAKPOINT_LG = '64rem';
export const TAILWIND_BREAKPOINT_CONTENT = '60.25rem'; // This is a custom setting
export const TAILWIND_CONTENT_PADDING_SM = '2rem'; // 32px equivalent
export const TAILWIND_CONTENT_PADDING_MD = '4rem'; // 64px equivalent

/**
 * Various settings
 */
// A string representing the year the site was founded; will default to the current year
export const SITE_YEAR_FOUNDED = 2009;

/**
 * Feature flags
 */
// Image metadata generation; set to "true" to enable
export const FEATURE_IMAGE_METADATA = true as boolean;

// Generate open graph images with Satori
export const FEATURE_OPEN_GRAPH_IMAGES = false as boolean;
