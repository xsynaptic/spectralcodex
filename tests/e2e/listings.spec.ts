import type { APIRequestContext } from '@playwright/test';

import { expect, test } from '@playwright/test';

import { paths } from '#e2e/constants.ts';

const collections = ['regions', 'themes', 'series', 'resources'];

const entryPattern = /^\/[^/]+\/$/;

async function readListedLinks(request: APIRequestContext, path: string, pattern: RegExp) {
	const response = await request.get(path);

	expect(response.status(), `${path} status`).toBe(200);

	const html = await response.text();
	const main = /<main[\s\S]*?<\/main>/.exec(html)?.[0] ?? '';
	const links = [...main.matchAll(/href="([^"]+)"/g)]
		.map(([, href = '']) => href)
		.filter((href) => pattern.test(href));

	expect(links.length, `entries listed on ${path}`).toBeGreaterThan(0);

	return links;
}

test(
	"every Collection's index and a detail page list entries",
	{ tag: '@smoke' },
	async ({ request }) => {
		for (const collection of collections) {
			const indexPath = `/${collection}/`;
			const [detailPath = ''] = await readListedLinks(
				request,
				indexPath,
				new RegExp(`^${indexPath}[^/]+/$`),
			);

			await readListedLinks(request, detailPath, entryPattern);
		}

		await readListedLinks(request, paths.chronologyYear, entryPattern);
	},
);
