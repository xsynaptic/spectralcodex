// Obscure port to avoid colliding with other projects' dev servers on Astro's default 4321
export const localPort = 47_321;
export const localUrl = `http://localhost:${String(localPort)}`;

export const isProd = process.env.TEST_ENV === 'prod';

export const contentManifestPath = '/content-manifest.json';

export const paths = {
	chronologyIndex: '/chronology/',
	chronologyMonth: '/chronology/2019/02/',
	chronologyYear: '/chronology/2019/',
	locationsIndex: '/locations/',
	locationsIndexPage2: '/locations/2/',
	postsIndex: '/posts/',
	regionDetail: '/regions/tainan/',
	regionDetailAncestor: '/regions/taiwan/',
} as const;

export function getBaseUrl(): string {
	if (!isProd) return localUrl;

	const prodUrl = process.env.PROD_SERVER_URL;

	if (!prodUrl) throw new Error('PROD_SERVER_URL is required when TEST_ENV=prod');

	return prodUrl;
}
