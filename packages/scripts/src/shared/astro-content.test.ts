import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { findAstroRoot } from './astro-content.ts';

let tempDir: string;

beforeEach(() => {
	tempDir = mkdtempSync(path.join(os.tmpdir(), 'astro-root-test-'));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

function makeTree(configFilename: string | undefined, nested: string) {
	const nestedDir = path.join(tempDir, nested);

	mkdirSync(nestedDir, { recursive: true });

	if (configFilename) writeFileSync(path.join(tempDir, configFilename), '');

	return nestedDir;
}

describe('findAstroRoot', () => {
	test('walks up from a nested package to the directory holding the config', () => {
		const nestedDir = makeTree('astro.config.ts', 'packages/scripts');

		expect(findAstroRoot(nestedDir)).toBe(tempDir);
	});

	test.each(['astro.config.mjs', 'astro.config.js', 'astro.config.mts'])(
		'accepts %s, as Astro does',
		(configFilename) => {
			const nestedDir = makeTree(configFilename, 'packages/scripts');

			expect(findAstroRoot(nestedDir)).toBe(tempDir);
		},
	);

	// Astro refuses the CommonJS variants, so treating one as a root would read every collection back empty
	test('ignores astro.config.cjs', () => {
		const nestedDir = makeTree('astro.config.cjs', 'packages/scripts');

		expect(() => findAstroRoot(nestedDir)).toThrow('Could not locate an Astro config');
	});

	test('throws rather than returning a root with no config', () => {
		const nestedDir = makeTree(undefined, 'packages/scripts');

		expect(() => findAstroRoot(nestedDir)).toThrow('Could not locate an Astro config');
	});
});
