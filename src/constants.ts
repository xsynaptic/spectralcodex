// Strip these MDX components from SEO descriptions and when generating word counts
export const MDX_COMPONENTS_TO_STRIP = ['Img', 'ImgGroup', 'Map', 'More'];

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
