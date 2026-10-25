import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { resolveImageSources } from '#image-manifest.ts';

let mediaPath: string;

function writeMediaFile(relativePath: string) {
	const filePath = path.join(mediaPath, relativePath);

	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, '');
}

beforeEach(() => {
	mediaPath = mkdtempSync(path.join(os.tmpdir(), 'image-manifest-test-'));
});

afterEach(() => {
	rmSync(mediaPath, { force: true, recursive: true });
});

describe('resolveImageSources', () => {
	test('each name resolves to the one source sharing its stem, whatever its extension', async () => {
		writeMediaFile('a/b-1.jpg');
		writeMediaFile('a/c.png');
		writeMediaFile('a/.DS_Store');

		expect(
			await resolveImageSources(mediaPath, ['a/b-1-450.jpg', 'a/b-1-350x233.webp', 'a/c-450.jpg']),
		).toStrictEqual({
			'a/b-1-350x233.webp': 'a/b-1.jpg',
			'a/b-1-450.jpg': 'a/b-1.jpg',
			'a/c-450.jpg': 'a/c.png',
		});
	});

	test('a name with no source fails', async () => {
		writeMediaFile('a/b.jpg');

		await expect(resolveImageSources(mediaPath, ['a/missing-450.jpg'])).rejects.toThrow(
			/no source/,
		);
	});

	test('stems differing only in case collide, since a case-insensitive disk stores them as one file', async () => {
		writeMediaFile('a/Foo.jpg');
		writeMediaFile('a/foo.png');

		await expect(resolveImageSources(mediaPath, ['a/foo-450.jpg'])).rejects.toThrow(
			'a/Foo.jpg, a/foo.png',
		);
	});

	test('a name whose stem differs in case from its only source has no source', async () => {
		writeMediaFile('a/Foo.jpg');

		await expect(resolveImageSources(mediaPath, ['a/foo-450.jpg'])).rejects.toThrow(/no source/);
	});

	test('a stem shared by two files fails, naming both', async () => {
		writeMediaFile('a/b.jpg');
		writeMediaFile('a/b.png');

		await expect(resolveImageSources(mediaPath, ['a/b-450.jpg'])).rejects.toThrow(
			'a/b.jpg, a/b.png',
		);
	});
});
