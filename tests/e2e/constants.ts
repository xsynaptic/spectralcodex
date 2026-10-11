// Obscure port to avoid colliding with other projects' dev servers on Astro's default 4321
export const localPort = 47_321;
export const localUrl = `http://localhost:${String(localPort)}`;

export const isProd = process.env.TEST_ENV === 'prod';

// Must match `PROD_SERVER_URL` in `.env`, which the deploy config reads as its site URL
export const prodUrl = 'https://spectralcodex.com/';

export const contentManifestPath = '/content-manifest.json';

export const paths = {
	chronologyIndex: '/chronology/',
	chronologyYear: '/chronology/2019/',
	locationsIndex: '/locations/',
	locationsIndexPage2: '/locations/2/',
	postsIndex: '/posts/',
	regionDetail: '/regions/tainan/',
	regionDetailAncestor: '/regions/taiwan/',
	seriesDetail: '/series/huadong-valley-ride-2018/',
	themeDetail: '/themes/taiwan-japanese-colonial-era/',
} as const;

export function getBaseUrl(): string {
	return isProd ? (process.env.PROD_SERVER_URL ?? prodUrl) : localUrl;
}
