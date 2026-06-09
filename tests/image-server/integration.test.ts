import type { ImagorFormats } from '@xsynaptic/unpic-imagor';

import { generate } from '@xsynaptic/unpic-imagor';
import { describe, expect, test } from 'vitest';

import { signImageServerPath } from '#lib/image/image-sign.ts';

const IMAGE_SERVER_URL = 'http://localhost:3100';
const IMAGE_SERVER_SECRET =
	process.env.IMAGE_SERVER_SECRET ?? 'dev-secret-do-not-use-in-production';

// Empty or unset both fall back to 20, matching the container's `${…:-20}` and Astro's default
const IMAGE_SERVER_SIGNATURE_LENGTH = Number(process.env.IMAGE_SERVER_SIGNATURE_LENGTH) || 20;
const TEST_IMAGE = 'example-folder-1/example-image-1.jpg';

function signedUrl(source: string, width: number, format: ImagorFormats, quality: number): string {
	const unsignedPath = generate(source, { width, format, quality }, { unsafe: false });
	const signature = signImageServerPath(
		unsignedPath,
		IMAGE_SERVER_SECRET,
		IMAGE_SERVER_SIGNATURE_LENGTH,
	);
	return `${IMAGE_SERVER_URL}/${signature}/${unsignedPath}`;
}

describe('image server integration', () => {
	test('health check returns 200', async () => {
		const response = await fetch(`${IMAGE_SERVER_URL}/health`);
		expect(response.status).toBe(200);
	});

	test('signed request returns image bytes', async () => {
		const response = await fetch(signedUrl(TEST_IMAGE, 450, 'jpg', 85));
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toMatch(/^image\//);
	});

	test('unsigned request is rejected', async () => {
		// No hash segment at all
		const response = await fetch(
			`${IMAGE_SERVER_URL}/450x0/filters:quality(85):format(jpg)/${TEST_IMAGE}`,
		);
		expect([401, 403]).toContain(response.status);
	});

	test('tampered signature is rejected', async () => {
		const unsignedPath = generate(
			TEST_IMAGE,
			{ width: 450, quality: 85, format: 'jpg' },
			{ unsafe: false },
		);
		const response = await fetch(
			`${IMAGE_SERVER_URL}/notavalidhash00000000000000000000000000/${unsignedPath}`,
		);
		expect([401, 403]).toContain(response.status);
	});

	test('missing image returns 404', async () => {
		const response = await fetch(signedUrl('does/not/exist.jpg', 450, 'jpg', 85));
		expect(response.status).toBe(404);
	});

	test('second hit on same URL is a cache HIT', async () => {
		// Use a unique width so this test does not collide with the first signed-request test
		const url = signedUrl(TEST_IMAGE, 612, 'webp', 70);
		await fetch(url);
		const response = await fetch(url);
		expect(response.status).toBe(200);
		expect(response.headers.get('x-cache-status')).toBe('HIT');
	});

	test('format filter actually changes output content-type', async () => {
		const webpResponse = await fetch(signedUrl(TEST_IMAGE, 451, 'webp', 70));
		expect(webpResponse.status).toBe(200);
		expect(webpResponse.headers.get('content-type')).toBe('image/webp');
	});
});
