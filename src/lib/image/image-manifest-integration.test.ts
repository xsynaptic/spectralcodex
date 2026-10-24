import { getImageDerivative, getImageManifestRecorder } from '@spectralcodex/shared/images';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
	getImageManifest,
	getUnrecordedImagePaths,
} from '#lib/image/image-manifest-integration.ts';

const imageBaseUrl = 'https://img.example.com';
const source = {
	height: 2400,
	id: 'taiwan/taipei/some-image-1.jpg',
	width: 3600,
};

let distPath: string;

function writeDistFile(relativePath: string, text: string) {
	const filePath = path.join(distPath, relativePath);

	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, text);
}

beforeEach(() => {
	distPath = mkdtempSync(path.join(os.tmpdir(), 'image-manifest-test-'));

	const recorder = getImageManifestRecorder();

	recorder.derivatives.clear();
	recorder.sources.clear();
});

afterEach(() => {
	rmSync(distPath, { force: true, recursive: true });
});

describe('getUnrecordedImagePaths', () => {
	test('flags a published path the recorder never saw, down to the gated map payloads', async () => {
		const recordedPath = getImageDerivative(source, 'content', 1200).path;
		const unrecordedPath = 'taiwan/taipei/some-image-1-350x233.webp';

		writeDistFile(
			'index.html',
			`<link href="${imageBaseUrl}" rel="preconnect"><img srcset="${imageBaseUrl}/${recordedPath} 1200w">`,
		);
		writeDistFile('api/map/objectives/0.json', `{"y":"${unrecordedPath} 350w"}`);
		writeDistFile('_x/main.css', `url(${imageBaseUrl}/taiwan/taipei/some-image-1-700x467.webp)`);

		expect(
			await getUnrecordedImagePaths(distPath, imageBaseUrl, getImageManifest('build', 'media')),
		).toStrictEqual([unrecordedPath]);
	});

	test('a URL under the base outside the grammar is flagged too', async () => {
		writeDistFile('rss.xml', `&lt;img src=&quot;${imageBaseUrl}/a/b.jpg&quot;`);

		expect(
			await getUnrecordedImagePaths(distPath, imageBaseUrl, getImageManifest('build', 'media')),
		).toStrictEqual(['a/b.jpg']);
	});
});
