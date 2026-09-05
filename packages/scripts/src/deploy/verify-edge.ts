import chalk from 'chalk';

import { loadDeployConfig } from '#deploy/deploy-config.ts';

interface EdgeExpectation {
	label: string;
	path: string;
	status: number;
	cacheControl: string;
}

// Node's fetch has no default timeout, so a hung connection would stall the deploy indefinitely
const requestTimeoutMs = 10_000;

function request(url: string, method: 'GET' | 'HEAD') {
	// Manual redirect so a broken trailing-slash rule fails loudly instead of being followed
	return fetch(url, {
		method,
		redirect: 'manual',
		signal: AbortSignal.timeout(requestTimeoutMs),
	});
}

export async function verifyEdge(): Promise<void> {
	const config = loadDeployConfig();

	const baseUrl = config.siteUrl.replace(/\/$/, '');

	// Unique query busts the Cloudflare cache key so every assertion reaches Caddy at the origin
	const token = Date.now().toString();
	const cacheBust = `edge-check=${token}`;

	console.log(chalk.blue('Verifying edge cache tiers...'));

	const failures: Array<string> = [];

	function check(expectation: EdgeExpectation, response: Response) {
		const { label, path, status, cacheControl } = expectation;

		if (response.status !== status) {
			failures.push(
				`${label} (${path}): expected status ${String(status)}, got ${String(response.status)}`,
			);
			return;
		}

		const actual = response.headers.get('cache-control') ?? '(absent)';

		if (actual !== cacheControl) {
			failures.push(`${label} (${path}): expected "${cacheControl}", got "${actual}"`);
			return;
		}

		console.log(chalk.gray(`  ok  ${label}: ${path}`));
	}

	const documentResponse = await request(`${baseUrl}/?${cacheBust}`, 'GET');

	check(
		{
			label: 'document',
			path: '/',
			status: 200,
			cacheControl: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
		},
		documentResponse,
	);

	const expectations: Array<EdgeExpectation> = [
		{
			label: 'static file',
			path: '/favicon.svg',
			status: 200,
			cacheControl: 'public, max-age=31536000',
		},
		{
			label: 'map chunk',
			path: '/api/map/map-directory.json',
			status: 200,
			cacheControl: 'public, max-age=31536000, immutable',
		},
		{
			label: 'map manifest',
			path: '/api/map/map-manifest.json',
			status: 200,
			cacheControl: 'no-store',
		},
		{
			label: 'objectives gate',
			path: '/objectives/',
			status: 401,
			cacheControl: 'private, no-store',
		},
		{
			label: 'objectives data gate',
			path: '/api/map/objectives/s.json',
			status: 401,
			cacheControl: 'private, no-store',
		},
		{
			label: 'robots',
			path: '/robots.txt',
			status: 200,
			cacheControl: 'public, max-age=3600, s-maxage=86400',
		},
		{
			label: 'sitemap',
			path: '/sitemap-index.xml',
			status: 200,
			cacheControl: 'public, max-age=3600, s-maxage=86400',
		},
		{
			label: 'not found',
			path: `/edge-check-${token}/`,
			status: 404,
			cacheControl: 'public, max-age=0, s-maxage=600',
		},
	];

	// Hashed asset names change every build, so take one from the document we already fetched
	if (documentResponse.status === 200) {
		const html = await documentResponse.text();
		const hashedAsset = /["'](\/_x\/[^"']+\.(?:css|js|woff2))["']/.exec(html)?.[1];

		if (hashedAsset) {
			expectations.push({
				label: 'hashed asset',
				path: hashedAsset,
				status: 200,
				cacheControl: 'public, max-age=31536000, immutable',
			});
		} else {
			failures.push('hashed asset (/_x/*): no hashed asset referenced by the document');
		}
	}

	const results = await Promise.all(
		expectations.map(async (expectation) => ({
			expectation,
			response: await request(`${baseUrl}${expectation.path}?${cacheBust}`, 'HEAD'),
		})),
	);

	for (const result of results) {
		check(result.expectation, result.response);
	}

	if (failures.length > 0) {
		for (const failure of failures) {
			console.error(chalk.red(`  fail  ${failure}`));
		}
		throw new Error(
			`Edge verification failed: ${String(failures.length)} check(s) do not match deploy/caddy/Caddyfile or a Cloudflare header rule is rewriting them`,
		);
	}

	console.log(chalk.green('Edge verification passed'));
}
