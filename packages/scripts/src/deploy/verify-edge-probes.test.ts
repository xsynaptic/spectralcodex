import { describe, expect, test } from 'vitest';

import type { EdgeProbe, ImageSample } from '#deploy/verify-edge-probes.ts';

import { getEdgeProbes, getProbeFailure } from '#deploy/verify-edge-probes.ts';

const config = { imageBaseUrl: 'https://img.example.com', siteUrl: 'https://example.com/' };
const token = '1700000000000';

const hashedAsset = '<link rel="stylesheet" href="/_x/main.a1b2c3.css">';
const openGraph = '<meta property="og:image" content="https://example.com/og/home.jpg">';

function getHero(srcset: string) {
	return `<img alt="" fetchpriority="high" srcset="${srcset}" src="/fallback.jpg">`;
}

const cropHero = getHero(
	'https://img.example.com/a/temple-1-1200x675.webp 1200w, https://img.example.com/a/temple-1-900x506.webp 900w',
);

const samples: Array<ImageSample> = [
	{ byteLength: 4096, format: 'jpg', path: 'a/temple-1-450.jpg' },
];

function probe(
	html: string | undefined,
	sampled: ReadonlyArray<ImageSample> | undefined = samples,
) {
	return getEdgeProbes({ config, html, samples: sampled, token });
}

function findProbe(probes: ReadonlyArray<EdgeProbe>, label: string) {
	return probes.find((candidate) => candidate.label === label);
}

function getImageHostProbes(probes: ReadonlyArray<EdgeProbe>) {
	return probes.filter((candidate) => candidate.url.startsWith(`${config.imageBaseUrl}/`));
}

describe('getEdgeProbes', () => {
	test('a complete document probes its hashed asset, card, hero and samples with no failures', () => {
		const { failures, probes } = probe(`${hashedAsset}${openGraph}${cropHero}`);

		expect(failures).toEqual([]);
		expect(findProbe(probes, 'hashed asset')).toMatchObject({
			method: 'HEAD',
			url: `https://example.com/_x/main.a1b2c3.css?edge-check=${token}`,
		});
		expect(findProbe(probes, 'OpenGraph card')?.url).toBe(
			`https://example.com/og/home.jpg?edge-check=${token}`,
		);
		expect(findProbe(probes, 'hero image')).toMatchObject({
			expect: { isNoSniff: true, status: 200 },
			url: 'https://img.example.com/a/temple-1-1200x675.webp',
		});
		expect(findProbe(probes, 'image sample')).toMatchObject({
			expect: { byteLength: 4096, contentType: 'image/jpeg', status: 200 },
			method: 'HEAD',
			url: 'https://img.example.com/a/temple-1-450.jpg',
		});
	});

	test('a crop hero yields a legacy imagor path the Caddy crop rule redirects to it', () => {
		const legacy = findProbe(
			probe(`${hashedAsset}${openGraph}${cropHero}`).probes,
			'legacy redirect',
		);
		const legacyPath = legacy ? new URL(legacy.url).pathname : '';

		expect(legacyPath).toMatch(
			/^\/[A-Za-z0-9_-]{20}\/([1-9][0-9]*)x([1-9][0-9]*)\/filters:quality\([0-9]+\):format\((jpg|webp)\)\/(.+)\.[a-z]+$/,
		);
		expect(legacyPath).toContain('/1200x675/');
		expect(legacyPath).toContain(':format(webp)/a/temple-1.jpg');
		expect(legacy?.expect).toMatchObject({ location: '/a/temple-1-1200x675.webp', status: 301 });
	});

	test('a hero that is not a crop fails the legacy probe but keeps the hero probe', () => {
		const { failures, probes } = probe(
			`${hashedAsset}${openGraph}${getHero('https://img.example.com/a/temple-1-1200.jpg 1200w')}`,
		);

		expect(failures).toEqual(['legacy redirect: hero candidate a/temple-1-1200.jpg is not a crop']);
		expect(findProbe(probes, 'hero image')).toBeDefined();
		expect(findProbe(probes, 'legacy redirect')).toBeUndefined();
	});

	test('a document without a hero fails and probes nothing on the image host', () => {
		const { failures, probes } = probe(`${hashedAsset}${openGraph}`);

		expect(failures).toEqual(['hero image: no hero image srcset in the document']);
		expect(getImageHostProbes(probes)).toEqual([]);
	});

	test('a hero off the image host fails and probes nothing on the image host', () => {
		const { failures, probes } = probe(
			`${hashedAsset}${openGraph}${getHero('/_img/a/temple-1-1200x675.webp 1200w')}`,
		);

		expect(failures).toEqual([
			'hero image: https://example.com/_img/a/temple-1-1200x675.webp is not under IMAGE_BASE_URL https://img.example.com',
		]);
		expect(getImageHostProbes(probes)).toEqual([]);
	});

	test('a document without og:image fails the card and still probes the rest', () => {
		const { failures, probes } = probe(`${hashedAsset}${cropHero}`);

		expect(failures).toEqual(['OpenGraph card: no og:image in the document']);
		expect(findProbe(probes, 'OpenGraph card')).toBeUndefined();
		expect(findProbe(probes, 'hashed asset')).toBeDefined();
		expect(findProbe(probes, 'hero image')).toBeDefined();
	});

	test('a missing manifest or local file fails instead of probing', () => {
		const html = `${hashedAsset}${openGraph}${cropHero}`;

		expect(getEdgeProbes({ config, html, samples: undefined, token }).failures).toEqual([
			'image sample: no local image manifest',
		]);
		expect(
			probe(html, [{ byteLength: undefined, format: 'webp', path: 'a/gone-450.webp' }]),
		).toMatchObject({ failures: ['image sample (/a/gone-450.webp): no local file'] });
	});

	test('without a document only the site table is probed', () => {
		const { failures, probes } = probe(undefined);

		expect(failures).toEqual([]);
		expect(probes.length).toBeGreaterThan(0);
		expect(getImageHostProbes(probes)).toEqual([]);
		expect(findProbe(probes, 'objectives gate')?.expect).toEqual({
			cacheControl: 'private, no-store',
			cfCacheStatus: 'DYNAMIC',
			status: 401,
		});
	});
});

const heroProbe: EdgeProbe = {
	expect: {
		cacheControl: 'public, max-age=60',
		contentType: 'image/',
		isNoSniff: true,
		status: 200,
	},
	label: 'hero image',
	method: 'GET',
	url: 'https://img.example.com/a/temple-1-1200x675.webp',
};

const heroHeaders = {
	'cache-control': 'public, max-age=60',
	'content-type': 'image/webp',
	'x-content-type-options': 'nosniff',
};

const sampleProbe: EdgeProbe = {
	expect: { byteLength: 4, contentType: 'image/jpeg', status: 200 },
	label: 'image sample',
	method: 'HEAD',
	url: 'https://img.example.com/a/temple-1-450.jpg',
};

function getSampleResponse(headers: Record<string, string>) {
	return new Response(undefined, { headers: { 'content-type': 'image/jpeg', ...headers } });
}

describe('getProbeFailure', () => {
	test('a response matching every expectation passes', () => {
		expect(getProbeFailure(heroProbe, new Response('', { headers: heroHeaders }))).toBeUndefined();
	});

	test('a session cookie fails any probe, image host included', () => {
		const response = new Response('', {
			headers: { ...heroHeaders, 'set-cookie': 'scx-objectives-session=abc; HttpOnly' },
		});

		expect(getProbeFailure(heroProbe, response)).toBe('response sets scx-objectives-session');
	});

	test('the first mismatch is reported', () => {
		expect(getProbeFailure(heroProbe, new Response('', { status: 404 }))).toBe(
			'expected status 200, got 404',
		);
		expect(
			getProbeFailure(
				heroProbe,
				new Response('', { headers: { ...heroHeaders, 'cache-control': 'no-store' } }),
			),
		).toBe('expected "public, max-age=60", got "no-store"');
		expect(
			getProbeFailure(
				heroProbe,
				new Response('', { headers: { ...heroHeaders, 'content-type': 'text/html' } }),
			),
		).toBe('expected content type image/, got "text/html"');
		expect(
			getProbeFailure(
				heroProbe,
				new Response('', { headers: { ...heroHeaders, 'x-content-type-options': '' } }),
			),
		).toBe('expected X-Content-Type-Options nosniff');
	});

	test('a cf-cache-status expectation fails when the header is absent', () => {
		const gate: EdgeProbe = {
			expect: { cacheControl: 'private, no-store', cfCacheStatus: 'DYNAMIC', status: 401 },
			label: 'objectives gate',
			method: 'HEAD',
			url: 'https://example.com/objectives/',
		};
		const response = new Response(undefined, {
			headers: { 'cache-control': 'private, no-store' },
			status: 401,
		});

		expect(getProbeFailure(gate, response)).toBe(
			'expected cf-cache-status "DYNAMIC", got "(absent)"',
		);
	});

	test('a redirect location resolves against the probe URL', () => {
		const legacy: EdgeProbe = {
			expect: { location: '/a/temple-1-1200x675.webp', status: 301 },
			label: 'legacy redirect',
			method: 'GET',
			url: 'https://img.example.com/sig/1200x675/filters:quality(80):format(webp)/a/temple-1.jpg',
		};

		expect(
			getProbeFailure(
				legacy,
				new Response(undefined, {
					headers: { location: '/a/temple-1-1200x675.webp' },
					status: 301,
				}),
			),
		).toBeUndefined();
		expect(
			getProbeFailure(
				legacy,
				new Response(undefined, { headers: { location: '/a/temple-1-1200.webp' }, status: 301 }),
			),
		).toBe('expected location /a/temple-1-1200x675.webp, got /a/temple-1-1200.webp');
	});

	test('a sample fails when its content length differs from the local file', () => {
		expect(
			getProbeFailure(sampleProbe, getSampleResponse({ 'content-length': '4' })),
		).toBeUndefined();
		expect(getProbeFailure(sampleProbe, getSampleResponse({ 'content-length': '3' }))).toBe(
			'expected content-length 4, got "3"',
		);
		expect(getProbeFailure(sampleProbe, getSampleResponse({}))).toBe(
			'expected content-length 4, got "(absent)"',
		);
	});
});
