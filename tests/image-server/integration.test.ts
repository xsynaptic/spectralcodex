import { describe, expect, test } from 'vitest';

import { generateSignedUrl } from '../../src/lib/image/image-server-utils.js';

const SERVER_URL = 'http://localhost:3100';
const SECRET = 'dev-secret-do-not-use-in-production';
const TEST_IMAGE = 'test/sample.jpg';

function signTestUrl(path: string): string {
	return generateSignedUrl(`${SERVER_URL}${path}`, SECRET);
}

describe('image server integration', () => {
	test('health check returns 200 (no signature required)', async () => {
		const response = await fetch(`${SERVER_URL}/health`);
		expect(response.status).toBe(200);
	});

	test('signed request returns JPEG', async () => {
		const url = signTestUrl(`/w_450,q_88,f_jpg/${TEST_IMAGE}`);
		const response = await fetch(url);
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/jpeg');
	});

	test('unsigned request returns 403', async () => {
		const response = await fetch(`${SERVER_URL}/w_450,q_88,f_jpg/${TEST_IMAGE}`);
		expect(response.status).toBe(403);
	});

	test('invalid signature returns 403', async () => {
		const response = await fetch(`${SERVER_URL}/w_450,q_88,f_jpg/${TEST_IMAGE}?s=invalid`);
		expect(response.status).toBe(403);
	});

	test('missing image returns 404', async () => {
		const url = signTestUrl('/w_450,q_88,f_jpg/does/not/exist.jpg');
		const response = await fetch(url);
		expect(response.status).toBe(404);
	});

	test('caching works (same URI = cache hit)', async () => {
		const url = signTestUrl(`/w_600,q_88,f_jpg/${TEST_IMAGE}`);
		await fetch(url);
		const response = await fetch(url);
		expect(response.headers.get('x-cache-status')).toBe('HIT');
	});
});
