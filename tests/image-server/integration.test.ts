import type { ImagorFormats } from '@xsynaptic/unpic-imagor';

import { generate } from '@xsynaptic/unpic-imagor';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';

import { signImageServerPath } from '#lib/image/image-sign.ts';

const imageServerUrl = 'http://localhost:3100';
const IMAGE_SERVER_SECRET =
	process.env.IMAGE_SERVER_SECRET ?? 'dev-secret-do-not-use-in-production';

// Empty or unset both fall back to 20, matching the container's `${…:-20}` and Astro's default
const IMAGE_SERVER_SIGNATURE_LENGTH = Number(process.env.IMAGE_SERVER_SIGNATURE_LENGTH) || 20;
const testImage = 'example-folder-1/example-image-1.jpg';

function signedUrl(source: string, width: number, format: ImagorFormats, quality: number): string {
	const unsignedPath = generate(source, { width, format, quality }, { unsafe: false });
	const signature = signImageServerPath(
		unsignedPath,
		IMAGE_SERVER_SECRET,
		IMAGE_SERVER_SIGNATURE_LENGTH,
	);
	return `${imageServerUrl}/${signature}/${unsignedPath}`;
}

describe('image server integration', () => {
	test('health check returns 200', async () => {
		const response = await fetch(`${imageServerUrl}/health`);
		expect(response.status).toBe(200);
	});

	test('signed request returns image bytes', async () => {
		const response = await fetch(signedUrl(testImage, 450, 'jpg', 85));
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toMatch(/^image\//);
	});

	test('unsigned request is rejected', async () => {
		// No hash segment at all
		const response = await fetch(
			`${imageServerUrl}/450x0/filters:quality(85):format(jpg)/${testImage}`,
		);
		expect([401, 403]).toContain(response.status);
	});

	test('tampered signature is rejected', async () => {
		const unsignedPath = generate(
			testImage,
			{ width: 450, quality: 85, format: 'jpg' },
			{ unsafe: false },
		);
		const response = await fetch(
			`${imageServerUrl}/notavalidhash00000000000000000000000000/${unsignedPath}`,
		);
		expect([401, 403]).toContain(response.status);
	});

	test('missing image returns 404', async () => {
		const response = await fetch(signedUrl('does/not/exist.jpg', 450, 'jpg', 85));
		expect(response.status).toBe(404);
	});

	test('second hit on same URL is a cache HIT', async () => {
		// Use a unique width so this test does not collide with the first signed-request test
		const url = signedUrl(testImage, 612, 'webp', 70);
		await fetch(url);
		const response = await fetch(url);
		expect(response.status).toBe(200);
		expect(response.headers.get('x-cache-status')).toBe('HIT');
	});

	test('format filter actually changes output content-type', async () => {
		const webpResponse = await fetch(signedUrl(testImage, 451, 'webp', 70));
		expect(webpResponse.status).toBe(200);
		expect(webpResponse.headers.get('content-type')).toBe('image/webp');
	});

	// A malformed op silently returns the unresized original, which every other test here would pass
	test('requested width is honored in the output image', async () => {
		const width = 375;
		const response = await fetch(signedUrl(testImage, width, 'jpg', 85));
		expect(response.status).toBe(200);

		const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
		expect(metadata.width).toBe(width);
	});
});
