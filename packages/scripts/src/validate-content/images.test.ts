import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { validateImageReferences } from '#validate-content/images.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

let mediaPath: string;

function writeMediaFile(relativePath: string) {
	const filePath = path.join(mediaPath, relativePath);

	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, '');
}

beforeEach(() => {
	mediaPath = mkdtempSync(path.join(os.tmpdir(), 'validate-images-'));
});

afterEach(() => {
	rmSync(mediaPath, { force: true, recursive: true });
});

describe('validateImageReferences', () => {
	const entry = makeEntry({ data: { imageFeatured: 'a/b.jpg' }, id: 'entry' });

	test('passes when every reference exists and every stem is unique', () => {
		writeMediaFile('a/b.jpg');
		writeMediaFile('a/c.png');

		expect(validateImageReferences([entry], mediaPath).status).toBe('pass');
	});

	test('fails on two files that share a stem', () => {
		writeMediaFile('a/b.jpg');
		writeMediaFile('a/b.png');

		const result = validateImageReferences([entry], mediaPath);

		expect(result.status).toBe('fail');
		expect(result.issues).toStrictEqual([
			{ location: 'a/b.jpg, a/b.png', message: 'one stem, so their image names collide' },
		]);
	});
});
