import type { APIRequestContext } from '@playwright/test';

import { contentManifestPath, paths } from './constants.ts';

export interface SitePaths {
	locationDetail: string;
	postDetail: string;
	postTitle: string;
}

interface CatalogItem {
	title: string;
	url: string;
}

interface ProbeOptions {
	indexPath: string;
	isQualified: (html: string) => boolean;
	request: APIRequestContext;
	titles: Map<string, string>;
}

const probeLimit = 8;

// A hero carousel alone carries several images, so a lone hero never clears this
const entryImageMinimum = 3;

let discovered: Promise<SitePaths> | undefined;

// The request context this was built from is disposed with its test; the resolved value is not
export function getSitePaths(request: APIRequestContext): Promise<SitePaths> {
	if (!discovered) discovered = discover(request);

	return discovered;
}

function countImages(html: string): number {
	return (html.match(/<img\b/g) ?? []).length;
}

async function discover(request: APIRequestContext): Promise<SitePaths> {
	const response = await request.get(contentManifestPath);
	const manifest = (await response.json()) as Array<CatalogItem>;
	const titles = new Map(manifest.map(({ title, url }) => [url, title]));

	const post = await probe({ indexPath: paths.postsIndex, isQualified: isPost, request, titles });
	const location = await probe({
		indexPath: paths.locationsIndex,
		isQualified: isLocation,
		request,
		titles,
	});

	return { locationDetail: location.url, postDetail: post.url, postTitle: post.title };
}

// Both collections' detail routes sit at the root, so the JSON-LD type is what tells them apart
function isLocation(html: string): boolean {
	return html.includes('"@type":"Place"') && html.includes('component-export="ReactMapComponent"');
}

function isPost(html: string): boolean {
	return (
		html.includes('"@type":"Article"') &&
		html.includes('fetchpriority="high"') &&
		countImages(html) >= entryImageMinimum
	);
}

async function probe({
	indexPath,
	isQualified,
	request,
	titles,
}: ProbeOptions): Promise<CatalogItem> {
	const index = await readText(request, indexPath);
	const main = /<main[\s\S]*?<\/main>/.exec(index)?.[0] ?? '';

	// Scoped to `main` so the site navigation's own links never become candidates
	const urls = [...main.matchAll(/href="(\/[^"/]+\/)"/g)].map(([, url = '']) => url);
	const candidates = [...new Set(urls)]
		.map((url) => ({ title: titles.get(url), url }))
		.filter((item): item is CatalogItem => item.title !== undefined)
		.slice(0, probeLimit);

	for (const candidate of candidates) {
		const html = await readText(request, candidate.url);

		if (html.includes('dt-published') && isQualified(html)) return candidate;
	}

	throw new Error(
		`No Entry among the first ${String(probeLimit)} on ${indexPath} is complete enough to test`,
	);
}

async function readText(request: APIRequestContext, path: string): Promise<string> {
	const response = await request.get(path);

	return response.text();
}
