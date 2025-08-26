/**
 * Content collections and schemas
 */
// Path to content from the root; defaults *e.g.* `./packages/content-demo/collections`
export const CONTENT_COLLECTIONS_PATH = './packages/content/collections';

// Path to content data from the root; defaults *e.g.* `./packages/content-demo/data`
export const CONTENT_DATA_PATH = './packages/content/data';

// Path to image assets from the root; *e.g.* `./packages/content-demo/media`
export const CONTENT_MEDIA_PATH = './packages/content/media';

// Remote host for media assets; mainly used to offset memory usage from direct imports
export const CONTENT_MEDIA_HOST = 'http://localhost:4321/media';

// An arbitrary identified for the "more" excerpt, used internally
export const CONTENT_EXCERPT_IDENTIFIER = 'more';

// Minimum width for featured images
export const CONTENT_IMAGE_FEATURED_MIN_WIDTH = 480;

/**
 * Image processing
 */
export const IMAGE_FORMAT = 'jpg';
export const IMAGE_QUALITY = 88;

export const IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ = 250;
export const IMAGE_PLACEHOLDER_PIXEL_COUNT_HQ = 1600;

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
export const OPEN_GRAPH_BASE_PATH = '0g';

export const OPEN_GRAPH_IMAGE_FORMAT = 'jpg';

// How many fallback images are there? These should already be located in the `/public` folder
export const OPEN_GRAPH_IMAGE_FALLBACK_COUNT = 5;
export const OPEN_GRAPH_IMAGE_FALLBACK_PREFIX = 'og-image';

// Minimum dimensions recommended by Facebook (1.91:1 aspect ratio)
export const OPEN_GRAPH_IMAGE_HEIGHT = 630;
export const OPEN_GRAPH_IMAGE_WIDTH = 1200;

// Generate high DPI Open Graph images
export const OPEN_GRAPH_IMAGE_DENSITY = 2;

// Not sure how useful this is nowadays
export const OPEN_GRAPH_TWITTER_USERNAME = '@spectralcodex';

/**
 * Tailwind CSS V4 breakpoints
 */
export const TAILWIND_BREAKPOINT_SM = '40rem';
export const TAILWIND_BREAKPOINT_MD = '48rem';
export const TAILWIND_BREAKPOINT_LG = '64rem';
export const TAILWIND_BREAKPOINT_CONTENT = '60.25rem'; // This is a custom setting

/**
 * Various settings
 */
// A string representing the year the site was founded; will default to the current year
export const SITE_YEAR_FOUNDED = 2009;

/**
 * Feature flags
 */
// Date-based post archives; set to "true" to enable
export const FEATURE_DATE_ARCHIVES = false as boolean;

// Image metadata generation; set to "true" to enable
export const FEATURE_IMAGE_METADATA = false as boolean;

// Nearby items are the single most expensive data generated in this project
export const FEATURE_LOCATION_NEARBY_ITEMS = import.meta.env.PROD;

// Map icons are currently under development
export const FEATURE_MAP_ICONS = false as boolean;

// Generate open graph images
export const FEATURE_OPEN_GRAPH_IMAGES = false as boolean;

// Set to "true" to log missing shortcode IDs
export const FEATURE_SHORTCODES_ERROR_LOG = true as boolean;
