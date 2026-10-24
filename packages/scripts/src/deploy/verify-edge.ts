import type { ImageDerivative, ImageFormat, ImageManifest } from '@spectralcodex/shared/images';

import { imageManifestFile, imageQualityByFormat } from '@spectralcodex/shared/images';
import chalk from 'chalk';
import { randomBytes } from 'node:crypto';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import * as R from 'remeda';

import type { DeployConfig } from '#deploy/deploy-config.ts';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { getLocalImagePaths } from '#images/images-state.ts';
import { findWorkspaceRoot, readJsonFile } from '#shared/utils.ts';

interface EdgeExpectation {
	cacheControl: string;
	cfCacheStatus?: string;
	label: string;
	path: string;
	status: number;
}

// Node's fetch never times out on its own, so a hung connection would stall the deploy
const requestTimeoutMs = 10_000;

const objectivesSessionCookie = 'scx-objectives-session';

const derivativeCacheControl =
	'public, max-age=2592000, stale-while-revalidate=604800, s-maxage=31536000, no-transform';
const derivativeNotFoundCacheControl = 'public, max-age=60';

const imageContentTypes = { jpg: 'image/jpeg', webp: 'image/webp' } satisfies Record<
	ImageFormat,
	string
>;

const imageSampleSize = 20;

export async function verifyEdge(): Promise<void> {
	const config = loadDeployConfig();

	const baseUrl = config.siteUrl.replace(/\/$/, '');

	const token = Date.now().toString();
	const cacheBust = `edge-check=${token}`;

	console.log(chalk.blue('Verifying edge cache tiers...'));

	const failures: Array<string> = [];

	function check(expectation: EdgeExpectation, response: Response) {
		const failure = response.headers.get('set-cookie')?.includes(objectivesSessionCookie)
			? `response sets ${objectivesSessionCookie}`
			: getEdgeFailure(expectation, response);

		if (failure) {
			failures.push(`${expectation.label} (${expectation.path}): ${failure}`);
			return;
		}

		console.log(chalk.gray(`  ok  ${expectation.label}: ${expectation.path}`));
	}

	const documentResponse = await request(`${baseUrl}/?${cacheBust}`, 'GET', 'document (/)');

	check(
		{
			cacheControl: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
			label: 'document',
			path: '/',
			status: 200,
		},
		documentResponse,
	);

	const expectations = getExpectations(token);

	if (documentResponse.status === 200) {
		const html = await documentResponse.text();
		const document = getDocumentExpectations(html);

		expectations.push(...document.expectations);
		failures.push(...document.failures, ...(await getImageHostFailures(html, config, token)));
	}

	const results = await Promise.all(
		expectations.map(async (expectation) => ({
			expectation,
			response: await request(
				`${baseUrl}${expectation.path}?${cacheBust}`,
				'HEAD',
				`${expectation.label} (${expectation.path})`,
			),
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
			`Edge verification failed: ${String(failures.length)} check(s) do not match deploy/caddy/Caddyfile or a Cloudflare rule is overriding them`,
		);
	}

	console.log(chalk.green('Edge verification passed'));
}

function fetchWithTimeout(url: string, method: 'GET' | 'HEAD') {
	return fetch(url, {
		method,
		redirect: 'manual',
		signal: AbortSignal.timeout(requestTimeoutMs),
	});
}

function getEdgeFailure(expectation: EdgeExpectation, response: Response) {
	const { cacheControl, cfCacheStatus, status } = expectation;

	if (response.status !== status) {
		return `expected status ${String(status)}, got ${String(response.status)}`;
	}

	const actual = response.headers.get('cache-control') ?? '(absent)';

	if (actual !== cacheControl) return `expected "${cacheControl}", got "${actual}"`;

	const actualCfCacheStatus = response.headers.get('cf-cache-status') ?? '(absent)';

	if (cfCacheStatus && actualCfCacheStatus !== cfCacheStatus) {
		return `expected cf-cache-status "${cfCacheStatus}", got "${actualCfCacheStatus}"`;
	}

	return;
}

function getDocumentExpectations(html: string) {
	const expectations: Array<EdgeExpectation> = [];
	const failures: Array<string> = [];
	const hashedAsset = /["'](\/_x\/[^"']+\.(?:css|js|woff2))["']/.exec(html)?.[1];
	const openGraphUrl = /property="og:image" content="([^"]+)"/.exec(html)?.[1];

	if (hashedAsset) {
		expectations.push({
			cacheControl: 'public, max-age=31536000, immutable',
			label: 'hashed asset',
			path: hashedAsset,
			status: 200,
		});
	} else {
		failures.push('hashed asset (/_x/*): no hashed asset referenced by the document');
	}

	if (openGraphUrl) {
		expectations.push({
			cacheControl: derivativeCacheControl,
			label: 'OpenGraph card',
			path: new URL(openGraphUrl).pathname,
			status: 200,
		});
	} else {
		failures.push('OpenGraph card: no og:image in the document');
	}

	return { expectations, failures };
}

function getExpectations(token: string): Array<EdgeExpectation> {
	return [
		{
			cacheControl: 'public, max-age=31536000',
			label: 'static file',
			path: '/favicon.svg',
			status: 200,
		},
		{
			cacheControl: 'public, max-age=31536000, immutable',
			label: 'map chunk',
			path: '/api/map/map-directory.json',
			status: 200,
		},
		{
			cacheControl: 'no-store',
			label: 'map manifest',
			path: '/api/map/map-manifest.json',
			status: 200,
		},
		{
			cacheControl: 'private, no-store',
			cfCacheStatus: 'DYNAMIC',
			label: 'objectives gate',
			path: '/objectives/',
			status: 401,
		},
		{
			cacheControl: 'private, no-store',
			cfCacheStatus: 'DYNAMIC',
			label: 'objectives data gate',
			path: '/api/map/objectives/map-directory.json',
			status: 401,
		},
		{
			cacheControl: 'public, max-age=3600, s-maxage=86400',
			label: 'robots',
			path: '/robots.txt',
			status: 200,
		},
		{
			cacheControl: 'public, max-age=3600, s-maxage=86400',
			label: 'sitemap',
			path: '/sitemap-index.xml',
			status: 200,
		},
		{
			cacheControl: 'public, max-age=0, s-maxage=600',
			label: 'not found',
			path: `/edge-check-${token}/`,
			status: 404,
		},
		{
			cacheControl: derivativeNotFoundCacheControl,
			label: 'missing OpenGraph card',
			path: `/og/edge-check-${token}.jpg`,
			status: 404,
		},
	];
}

function getImageFormat(imagePath: string): ImageFormat {
	return imagePath.endsWith('.webp') ? 'webp' : 'jpg';
}

async function getHeroImageFailures(imageUrl: string) {
	const response = await request(imageUrl, 'GET', 'hero image');
	const contentType = response.headers.get('content-type') ?? '(absent)';
	const failure = getEdgeFailure(
		{ cacheControl: derivativeCacheControl, label: 'hero image', path: imageUrl, status: 200 },
		response,
	);

	if (failure) return [`hero image (${imageUrl}): ${failure}`];

	if (!contentType.startsWith('image/')) {
		return [`hero image (${imageUrl}): expected an image type, got "${contentType}"`];
	}

	if (response.headers.get('x-content-type-options') !== 'nosniff') {
		return [`hero image (${imageUrl}): expected X-Content-Type-Options nosniff`];
	}

	console.log(chalk.gray(`  ok  hero image: ${imageUrl}`));

	return [];
}

// Real legacy URLs are still edge hits on their old 200s, so only a made-up signature reaches the redirect
async function getLegacyRedirectFailures(imageBaseUrl: string, imagePath: string) {
	const match = /^(?<stem>.+)-(?<width>\d+)x(?<height>\d+)\.(?:jpg|webp)$/.exec(imagePath);

	if (!match?.groups) return [`legacy redirect: hero candidate ${imagePath} is not a crop`];

	const { height, stem, width } = match.groups;
	const format = getImageFormat(imagePath);
	const signature = randomBytes(15).toString('base64url');
	const legacyPath = `/${signature}/${String(width)}x${String(height)}/filters:quality(${String(imageQualityByFormat[format])}):format(${format})/${String(stem)}.jpg`;
	const response = await request(`${imageBaseUrl}${legacyPath}`, 'GET', 'legacy redirect');
	const failure = getEdgeFailure(
		{
			cacheControl: derivativeCacheControl,
			label: 'legacy redirect',
			path: legacyPath,
			status: 301,
		},
		response,
	);
	if (failure) return [`legacy redirect (${legacyPath}): ${failure}`];

	const location = new URL(response.headers.get('location') ?? '', imageBaseUrl).pathname;

	if (location !== `/${imagePath}`) {
		return [`legacy redirect (${legacyPath}): expected /${imagePath}, got ${location}`];
	}

	console.log(chalk.gray(`  ok  legacy redirect: ${legacyPath}`));

	return [];
}

async function getMissingImageFailures(imageBaseUrl: string, token: string) {
	const missingPath = `/edge-check-${token}-450.webp`;
	const response = await request(`${imageBaseUrl}${missingPath}`, 'GET', 'missing image');
	const failure = getEdgeFailure(
		{
			cacheControl: derivativeNotFoundCacheControl,
			label: 'missing image',
			path: missingPath,
			status: 404,
		},
		response,
	);

	if (failure) return [`missing image (${missingPath}): ${failure}`];

	console.log(chalk.gray(`  ok  missing image: ${missingPath}`));

	return [];
}

async function getFileSize(filePath: string) {
	try {
		const stats = await stat(filePath);

		return stats.size;
	} catch {
		return;
	}
}

async function getSampleFailure(
	imageBaseUrl: string,
	rootPath: string,
	derivative: ImageDerivative,
) {
	const expectedType = imageContentTypes[derivative.format];
	const localSize = await getFileSize(
		path.join(getLocalImagePaths(rootPath).derivativesPath, derivative.path),
	);
	const response = await request(`${imageBaseUrl}/${derivative.path}`, 'GET', derivative.path);
	const contentType = response.headers.get('content-type');
	const body = await response.arrayBuffer();

	if (contentType === expectedType && response.status === 200 && body.byteLength === localSize) {
		return;
	}

	return `image sample (${derivative.path}): expected 200, ${expectedType} and ${String(localSize)} bytes, got ${String(response.status)}, ${String(contentType)} and ${String(body.byteLength)} bytes`;
}

async function getManifestSampleFailures(imageBaseUrl: string) {
	const rootPath = findWorkspaceRoot();
	const manifest = await readJsonFile<ImageManifest>(
		path.join(getLocalImagePaths(rootPath).statePath, imageManifestFile),
	);

	if (!manifest) return ['image sample: no local image manifest'];

	const sample = R.sample(manifest.derivatives, imageSampleSize);
	const failures = await Promise.all(
		sample.map((derivative) => getSampleFailure(imageBaseUrl, rootPath, derivative)),
	);

	const sampleFailures = failures.filter(R.isNonNullish);

	if (sampleFailures.length === 0) {
		console.log(chalk.gray(`  ok  image sample: ${String(sample.length)} manifest paths`));
	}

	return sampleFailures;
}

async function getImageHostFailures(html: string, config: DeployConfig, token: string) {
	const srcset = /<img\b[^>]*\bfetchpriority="high"[^>]*\bsrcset="([^"]+)"/.exec(html)?.[1];
	const candidate = srcset?.trim().split(/\s+/, 1)[0];

	if (!candidate) return ['hero image: no hero image srcset in the document'];

	const imageUrl = new URL(candidate, config.siteUrl).href;

	if (!imageUrl.startsWith(`${config.imageBaseUrl}/`)) {
		return [`hero image: ${imageUrl} is not under IMAGE_BASE_URL ${config.imageBaseUrl}`];
	}

	const imagePath = imageUrl.slice(config.imageBaseUrl.length + 1);
	const results = await Promise.all([
		getHeroImageFailures(imageUrl),
		getLegacyRedirectFailures(config.imageBaseUrl, imagePath),
		getMissingImageFailures(config.imageBaseUrl, token),
		getManifestSampleFailures(config.imageBaseUrl),
	]);

	return results.flat();
}

async function request(url: string, method: 'GET' | 'HEAD', label: string) {
	try {
		return await fetchWithTimeout(url, method);
	} catch (error) {
		if (!(error instanceof DOMException && error.name === 'TimeoutError')) throw error;
	}

	try {
		return await fetchWithTimeout(url, method);
	} catch (error) {
		throw new Error(`${label}: no response within ${String(requestTimeoutMs)}ms after a retry`, {
			cause: error,
		});
	}
}
