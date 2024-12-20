/**
 * Site configuration
 */
// A string representing the year the site was founded; will default to the current year
export const SITE_YEAR_FOUNDED = 2009;

/**
 * Content schemas
 */
export const CONTENT_EXCERPT_IDENTIFIER = 'more';

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
export const MAP_API_SOURCE_ID = 's';
export const MAP_API_POPUP_ID = 'p';

// Limit precision of coordinate data; may be superseded by Turf's truncate function
export const MAP_GEOMETRY_COORDINATES_PRECISION = 6;

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
 * Feature flags
 */
// Date-based post archives; set to "true" to enable
export const FEATURE_DATE_ARCHIVES = false as boolean;

// Image metadata page functionality is disabled by default; set to "true" to enable
export const FEATURE_IMAGE_PAGES = false as boolean;

//Generate open graph images
export const FEATURE_OPEN_GRAPH_IMAGES = false as boolean;

// Set to "true" to log missing shortcode IDs
export const FEATURE_SHORTCODES_ERROR_LOG = true as boolean;
