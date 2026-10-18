import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { makeEntry } from '#lib/collections/collections-test-utils.ts';

const { getCollectionMock } = vi.hoisted(() => ({ getCollectionMock: vi.fn() }));

vi.mock('astro:content', () => ({ getCollection: getCollectionMock }));
vi.mock('astro:env/server', () => ({
	IMAGE_SERVER_SECRET: 'secret',
	IMAGE_SERVER_SIGNATURE_LENGTH: 16,
}));
vi.mock('#lib/utils/description-data.ts', () => ({
	getDescriptionRendered: (entry: { data: { description?: string } }) =>
		entry.data.description ? { html: `<p>${entry.data.description}</p>` } : undefined,
}));

function makeStore() {
	return {
		images: [makeEntry('images', 'image-temple', { width: 1200 })],
		locations: [
			makeEntry('locations', 'temple', {
				description: 'Authored description',
				geometry: { coordinates: [121.5, 25.03] },
				imageFeatured: 'image-temple',
				links: ['https://maps.app.goo.gl/temple'],
				regions: [{ id: 'taipei' }],
				status: 'operational',
				themes: [{ id: 'temples' }],
			}),
			makeEntry('locations', 'bunker', {
				description: 'Authored description',
				geometry: [
					// eslint-disable-next-line unicorn/no-null -- null deliberately overrides imageFeatured to render no thumbnail
					{ coordinates: [121.51, 25.04], imageFeatured: null },
					{ coordinates: [121.52, 25.05], imageFeatured: 'image-temple' },
				],
				hideGeometry: true,
				override: {
					description: 'Override description',
					id: 'anonymous',
					regions: [{ id: 'tainan' }],
					title: 'Override title',
				},
				regions: [{ id: 'taipei' }],
				status: 'abandoned',
			}),
		],
		posts: [
			makeEntry('posts', 'post', {
				locations: [{ id: 'temple' }],
				regions: [{ id: 'taipei' }],
				themes: [{ id: 'temples' }],
			}),
		],
		regions: [
			makeEntry('regions', 'taiwan'),
			makeEntry('regions', 'taipei', { parent: 'taiwan' }),
			makeEntry('regions', 'tainan', { parent: 'taiwan' }),
		],
		resources: [makeEntry('resources', 'maps', { match: 'maps.app.goo.gl' })],
		series: [makeEntry('series', 'tour', { seriesItems: ['temple', 'post'] })],
		themes: [makeEntry('themes', 'temples')],
	};
}

let store: ReturnType<typeof makeStore>;

beforeEach(() => {
	vi.resetModules();
	vi.stubEnv('DEV', false);
	vi.spyOn(console, 'log').mockImplementation(vi.fn());

	store = makeStore();
	getCollectionMock.mockImplementation((collection: keyof typeof store) =>
		Promise.resolve(store[collection]),
	);
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

async function loadWrappers() {
	const [locations, regions, resources, series, themes] = await Promise.all([
		import('#lib/collections/locations/locations-data.ts'),
		import('#lib/collections/regions/regions-data.ts'),
		import('#lib/collections/resources/resources-data.ts'),
		import('#lib/collections/series/series-data.ts'),
		import('#lib/collections/themes/themes-data.ts'),
	]);

	return {
		locations: await locations.getLocationsCollection(),
		regions: await regions.getRegionsCollection(),
		resources: await resources.getResourcesCollection(),
		series: await series.getSeriesCollection(),
		themes: await themes.getThemesCollection(),
	};
}

describe('collection wrappers', () => {
	test('never write the content store', async () => {
		const snapshot = structuredClone(store);

		await loadWrappers();

		expect(store).toEqual(snapshot);
	});

	test('publish an Override under its own id and title', async () => {
		const { locations } = await loadWrappers();

		expect(locations.entriesMap.get('bunker')?.data).toMatchObject({
			_url: '/anonymous/',
			title: 'Override title',
		});
	});

	test('carry point thumbnails on copied points', async () => {
		const { locations } = await loadWrappers();

		const geometry = locations.entriesMap.get('bunker')?.data.geometry;
		const [pointHidden, pointFeatured] = Array.isArray(geometry) ? geometry : [];

		expect(pointHidden?._imageThumbnail).toBeNull();
		expect(pointFeatured?._imageThumbnail?.srcSet).toContain('350w');

		const storeGeometry = store.locations[1]?.data.geometry;

		expect(Array.isArray(storeGeometry) ? storeGeometry : []).not.toContain(pointFeatured);
	});

	test('count series items and gather theme members', async () => {
		const { series, themes } = await loadWrappers();

		expect(series.entriesMap.get('tour')?.data).toMatchObject({
			_entryCount: 2,
			_locationCount: 1,
			_postCount: 1,
		});
		expect(themes.entriesMap.get('temples')?.data).toMatchObject({
			_locations: ['temple'],
			_posts: ['post'],
		});
	});
});
