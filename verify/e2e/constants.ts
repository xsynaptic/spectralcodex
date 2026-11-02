import { readFileSync } from 'node:fs';

// An unusual port, so the preview never collides with another project's dev server on 4321
export const localPort = 47_321;
export const localUrl = `http://localhost:${String(localPort)}`;

export const isDev = process.env.TEST_ENV === 'dev';
export const isProd = process.env.TEST_ENV === 'prod';
export const isAllEngines = process.env.TEST_ENGINES === 'all';

// Keep this in step with `PROD_SERVER_URL` in `.env`, which the deploy config reads as its site URL
export const prodUrl = 'https://spectralcodex.com/';

export const contentManifestPath = '/content-manifest.json';

export const paths = {
	chronologyIndex: '/chronology/',
	chronologyYear: '/chronology/2019/',
	locationMultiPoint: '/budai-saltworks/',
	locationsIndex: '/locations/',
	locationsIndexPage2: '/locations/2/',
	locationSinglePoint: '/tainan-confucian-temple/',
	postDetail: '/huadong-valley-ride-2018-hualien-city/',
	postLocation: '/hualien-haohua-theater/',
	postsIndex: '/posts/',
	regionDetail: '/regions/tainan/',
	regionDetailAncestor: '/regions/taiwan/',
	seriesDetail: '/series/southern-taiwan-ride-2018/',
	themeDetail: '/themes/taiwan-japanese-colonial-era/',
} as const;

function readDevServerUrl(): string {
	const { url } = JSON.parse(readFileSync('.astro/dev.json', 'utf8')) as { url: string };

	return url;
}

export function getBaseUrl(): string {
	if (isProd) return process.env.PROD_SERVER_URL ?? prodUrl;
	if (isDev) return readDevServerUrl();

	return localUrl;
}
