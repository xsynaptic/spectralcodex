import type { ImageFormat } from '@xsynaptic/astro-image-pipeline/names';

import { imageQualityByFormat, isSiteImageFormat } from '@spectralcodex/shared/images';
import { parseRenditionName } from '@xsynaptic/astro-image-pipeline/names';
import { createHash } from 'node:crypto';

import type { DeployConfig } from '#deploy/deploy-config.ts';

export interface EdgeProbe {
	expect: {
		byteLength?: number;
		cacheControl?: string;
		cfCacheStatus?: string;
		contentType?: string;
		isNoSniff?: boolean;
		location?: string;
		status: number;
	};
	label: string;
	method: 'GET' | 'HEAD';
	url: string;
}

interface SiteExpectation extends Pick<
	EdgeProbe['expect'],
	'cacheControl' | 'cfCacheStatus' | 'status'
> {
	label: string;
	path: string;
}

export interface ImageSample {
	byteLength: number | undefined;
	format: ImageFormat;
	path: string;
}

const objectivesSessionCookie = 'scx-objectives-session';

const documentCacheControl = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400';
const renderedCacheControl =
	'public, max-age=2592000, stale-while-revalidate=604800, s-maxage=31536000, no-transform';
const renderedNotFoundCacheControl = 'public, max-age=60';

const imageContentTypes = {
	avif: 'image/avif',
	jpg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
} satisfies Record<ImageFormat, string>;

function getSiteBaseUrl(config: Pick<DeployConfig, 'siteUrl'>) {
	return config.siteUrl.replace(/\/$/, '');
}

function getCacheBust(token: string) {
	return `edge-check=${token}`;
}

export function describeProbe(probe: EdgeProbe) {
	return new URL(probe.url).pathname;
}

export function getDocumentProbe({
	config,
	token,
}: {
	config: Pick<DeployConfig, 'siteUrl'>;
	token: string;
}): EdgeProbe {
	return {
		expect: { cacheControl: documentCacheControl, status: 200 },
		label: 'document',
		method: 'GET',
		url: `${getSiteBaseUrl(config)}/?${getCacheBust(token)}`,
	};
}

function getSiteExpectations(token: string): Array<SiteExpectation> {
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
			cacheControl: renderedNotFoundCacheControl,
			label: 'missing OpenGraph card',
			path: `/og/edge-check-${token}.jpg`,
			status: 404,
		},
	];
}

function getDocumentExpectations(html: string) {
	const hashedAsset = /["'](\/_x\/[^"']+\.(?:css|js|woff2))["']/.exec(html)?.[1];
	const openGraphUrl = /property="og:image" content="([^"]+)"/.exec(html)?.[1];
	const expectations: Array<SiteExpectation> = [];
	const failures: Array<string> = [];

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
			cacheControl: renderedCacheControl,
			label: 'OpenGraph card',
			path: new URL(openGraphUrl).pathname,
			status: 200,
		});
	} else {
		failures.push('OpenGraph card: no og:image in the document');
	}

	return { expectations, failures };
}

function toSiteProbes(
	config: Pick<DeployConfig, 'siteUrl'>,
	expectations: ReadonlyArray<SiteExpectation>,
	token: string,
) {
	return expectations.map(({ label, path, ...expect }): EdgeProbe => ({
		expect,
		label,
		method: 'HEAD',
		url: `${getSiteBaseUrl(config)}${path}?${getCacheBust(token)}`,
	}));
}

// Real legacy URLs still hit their cached 200s at the edge, so the probe makes up a signature to reach the redirect
function getLegacyRedirectProbes(imageBaseUrl: string, imagePath: string, token: string) {
	const parsed = parseRenditionName(imagePath);

	if (parsed?.height === undefined) {
		return { failures: [`legacy redirect: hero candidate ${imagePath} is not a crop`], probes: [] };
	}

	if (!isSiteImageFormat(parsed.format)) {
		return {
			failures: [`legacy redirect: hero candidate ${imagePath} is not a jpg or webp`],
			probes: [],
		};
	}

	const { format, height, stem, width } = parsed;
	const signature = createHash('sha256').update(token).digest('base64url').slice(0, 20);
	const legacyPath = `/${signature}/${String(width)}x${String(height)}/filters:quality(${String(imageQualityByFormat[format])}):format(${format})/${stem}.jpg`;

	const probe: EdgeProbe = {
		expect: { cacheControl: renderedCacheControl, location: `/${imagePath}`, status: 301 },
		label: 'legacy redirect',
		method: 'GET',
		url: `${imageBaseUrl}${legacyPath}`,
	};

	return { failures: [], probes: [probe] };
}

function getSampleProbes(imageBaseUrl: string, samples: ReadonlyArray<ImageSample> | undefined) {
	if (!samples) return { failures: ['image sample: no local image manifest'], probes: [] };

	const probes: Array<EdgeProbe> = [];
	const failures: Array<string> = [];

	for (const sample of samples) {
		if (sample.byteLength === undefined) {
			failures.push(`image sample (/${sample.path}): no local file`);
			continue;
		}

		probes.push({
			expect: {
				byteLength: sample.byteLength,
				contentType: imageContentTypes[sample.format],
				status: 200,
			},
			label: 'image sample',
			method: 'HEAD',
			url: `${imageBaseUrl}/${sample.path}`,
		});
	}

	return { failures, probes };
}

function getImageHostProbes({
	config,
	html,
	samples,
	token,
}: {
	config: Pick<DeployConfig, 'imageBaseUrl' | 'siteUrl'>;
	html: string;
	samples: ReadonlyArray<ImageSample> | undefined;
	token: string;
}) {
	const { imageBaseUrl } = config;
	const srcset = /<img\b[^>]*\bfetchpriority="high"[^>]*\bsrcset="([^"]+)"/.exec(html)?.[1];
	const candidate = srcset?.trim().split(/\s+/, 1)[0];

	if (!candidate) {
		return { failures: ['hero image: no hero image srcset in the document'], probes: [] };
	}

	const imageUrl = new URL(candidate, config.siteUrl).href;

	if (!imageUrl.startsWith(`${imageBaseUrl}/`)) {
		return {
			failures: [`hero image: ${imageUrl} is not under IMAGE_BASE_URL ${imageBaseUrl}`],
			probes: [],
		};
	}

	const legacy = getLegacyRedirectProbes(
		imageBaseUrl,
		imageUrl.slice(imageBaseUrl.length + 1),
		token,
	);
	const sampled = getSampleProbes(imageBaseUrl, samples);
	const hero: EdgeProbe = {
		expect: {
			cacheControl: renderedCacheControl,
			contentType: 'image/',
			isNoSniff: true,
			status: 200,
		},
		label: 'hero image',
		method: 'GET',
		url: imageUrl,
	};
	const missing: EdgeProbe = {
		expect: { cacheControl: renderedNotFoundCacheControl, status: 404 },
		label: 'missing image',
		method: 'GET',
		url: `${imageBaseUrl}/edge-check-${token}-450.webp`,
	};

	return {
		failures: [...legacy.failures, ...sampled.failures],
		probes: [hero, ...legacy.probes, missing, ...sampled.probes],
	};
}

export function getEdgeProbes({
	config,
	html,
	samples,
	token,
}: {
	config: Pick<DeployConfig, 'imageBaseUrl' | 'siteUrl'>;
	html: string | undefined;
	samples: ReadonlyArray<ImageSample> | undefined;
	token: string;
}) {
	const siteExpectations = getSiteExpectations(token);

	if (html === undefined) {
		return { failures: [], probes: toSiteProbes(config, siteExpectations, token) };
	}

	const document = getDocumentExpectations(html);
	const imageHost = getImageHostProbes({ config, html, samples, token });

	return {
		failures: [...document.failures, ...imageHost.failures],
		probes: [
			...toSiteProbes(config, [...siteExpectations, ...document.expectations], token),
			...imageHost.probes,
		],
	};
}

function readHeader(headers: Headers, name: string) {
	return headers.get(name) ?? '(absent)';
}

function readLocation(headers: Headers, url: string) {
	return new URL(headers.get('location') ?? '', url).pathname;
}

function getHeaderFailure({ expect, url }: EdgeProbe, headers: Headers) {
	const cacheControl = readHeader(headers, 'cache-control');
	const cfCacheStatus = readHeader(headers, 'cf-cache-status');
	const contentLength = readHeader(headers, 'content-length');
	const contentType = readHeader(headers, 'content-type');
	const location = readLocation(headers, url);
	const checks = [
		{
			isMatch: expect.byteLength === undefined || contentLength === String(expect.byteLength),
			message: `expected content-length ${String(expect.byteLength)}, got "${contentLength}"`,
		},
		{
			isMatch: expect.cacheControl === undefined || cacheControl === expect.cacheControl,
			message: `expected "${String(expect.cacheControl)}", got "${cacheControl}"`,
		},
		{
			isMatch: expect.cfCacheStatus === undefined || cfCacheStatus === expect.cfCacheStatus,
			message: `expected cf-cache-status "${String(expect.cfCacheStatus)}", got "${cfCacheStatus}"`,
		},
		{
			isMatch: expect.contentType === undefined || contentType.startsWith(expect.contentType),
			message: `expected content type ${String(expect.contentType)}, got "${contentType}"`,
		},
		{
			isMatch: expect.isNoSniff !== true || headers.get('x-content-type-options') === 'nosniff',
			message: 'expected X-Content-Type-Options nosniff',
		},
		{
			isMatch: expect.location === undefined || location === expect.location,
			message: `expected location ${String(expect.location)}, got ${location}`,
		},
	];

	return checks.find((check) => !check.isMatch)?.message;
}

export function getProbeFailure(probe: EdgeProbe, response: Response) {
	if (response.headers.get('set-cookie')?.includes(objectivesSessionCookie)) {
		return `response sets ${objectivesSessionCookie}`;
	}

	if (response.status !== probe.expect.status) {
		return `expected status ${String(probe.expect.status)}, got ${String(response.status)}`;
	}

	return getHeaderFailure(probe, response.headers);
}
