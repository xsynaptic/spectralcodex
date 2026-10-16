import type { APIRequestContext } from '@playwright/test';

import { expect, test } from '@playwright/test';
import { getCollectionEntries, withAstroContent } from '@spectralcodex/scripts/astro-content';
import { getPublicId } from '@spectralcodex/shared/entries';

import { contentManifestPath, isDev } from '#e2e/constants.ts';

test.skip(isDev, 'content policy is off in dev');

// Failure messages carry counts, never paths; a real ID in a report is itself a leak
const mapManifestPath = '/api/map/map-manifest.json';
const feedPaths = ['/sitemap-0.xml', contentManifestPath, '/rss.xml'];

async function readSensitiveLocations() {
	const locations = await withAstroContent((content) =>
		getCollectionEntries(content, ['locations']),
	);

	return {
		anonymizedPaths: locations
			.filter((entry) => getPublicId(entry) !== entry.id)
			.map((entry) => `/${entry.id}/`),
		hiddenPaths: locations
			.filter((entry) => entry.data.hideLocation)
			.map((entry) => `/${getPublicId(entry)}/`),
	};
}

// Root-level paths only, so a Region or Theme sharing a slug is not mistaken for the Location
function getRootPaths(body: string) {
	const pattern = /(?:["'>\s]|https?:\/\/[^/"'<>\s]+)(\/[^/"'<>\s\\?#]+\/)(?=["'<\s\\?#])/g;

	return new Set([...body.matchAll(pattern)].map(([, rootPath = '']) => rootPath));
}

async function readRootPaths(request: APIRequestContext, surface: string) {
	const response = await request.get(surface);

	expect(response.ok(), `${surface} is served`).toBe(true);

	return getRootPaths(await response.text());
}

// Without this, a refused connection's error would print the path it asked for
async function readStatus(request: APIRequestContext, target: string) {
	try {
		const response = await request.get(target);

		return response.status();
	} catch {
		return 0;
	}
}

function countNamed(paths: Array<string>, rootPaths: Set<string>) {
	return paths.filter((item) => rootPaths.has(item)).length;
}

test('sensitive Locations stay out of the build output', { tag: '@smoke' }, async ({ request }) => {
	const { anonymizedPaths, hiddenPaths } = await readSensitiveLocations();

	test.skip(
		anonymizedPaths.length + hiddenPaths.length === 0,
		'this content set has no anonymized or hidden Locations',
	);

	const statuses = await Promise.all(anonymizedPaths.map((item) => readStatus(request, item)));

	expect
		.soft(
			statuses.filter((status) => status !== 404).length,
			'anonymized Locations answering at their real ID',
		)
		.toBe(0);

	for (const surface of feedPaths) {
		const rootPaths = await readRootPaths(request, surface);

		expect
			.soft(countNamed(anonymizedPaths, rootPaths), `anonymized Locations named in ${surface}`)
			.toBe(0);
	}

	const manifestResponse = await request.get(mapManifestPath);
	const mapPaths = ((await manifestResponse.json()) as Array<string>).filter(
		(surface) => !surface.startsWith('/api/map/divisions/'),
	);

	expect(mapPaths.length, 'public map files').toBeGreaterThan(0);

	const mapSurfaces = await Promise.all(
		mapPaths.map(async (surface) => ({
			rootPaths: await readRootPaths(request, surface),
			surface,
		})),
	);

	for (const { rootPaths, surface } of mapSurfaces) {
		expect
			.soft(countNamed(anonymizedPaths, rootPaths), `anonymized Locations named in ${surface}`)
			.toBe(0);
		expect
			.soft(countNamed(hiddenPaths, rootPaths), `hidden Locations placed in ${surface}`)
			.toBe(0);
	}
});
