import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { scanImageNames } from '#output-scan.ts';

const baseUrl = 'https://img.example.com';
const scan = { names: ['api/map/**/*.json'], urls: ['**/*.html', 'rss.xml'] };

let outputPath: string;

function writeOutputFile(relativePath: string, text: string) {
	const filePath = path.join(outputPath, relativePath);

	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, text);
}

beforeEach(() => {
	outputPath = mkdtempSync(path.join(os.tmpdir(), 'output-scan-test-'));
});

afterEach(() => {
	rmSync(outputPath, { force: true, recursive: true });
});

describe('scanImageNames', () => {
	test('reads URLs from page surfaces and bare names from payloads, and nothing else', async () => {
		writeOutputFile(
			'index.html',
			`<link href="${baseUrl}" rel="preconnect"><img srcset="${baseUrl}/a/b-1-1200.jpg 1200w, ${baseUrl}/a/b-1-1800.jpg 1800w">`,
		);
		writeOutputFile('api/map/objectives/0.json', '{"y":[["a/b-1-350x233.webp",350]]}');
		writeOutputFile('api/map/0.json.br', '"a/c-350x233.webp"');
		writeOutputFile('_x/main.css', `url(${baseUrl}/a/b-1-700x467.webp)`);

		const { invalid, names } = await scanImageNames(outputPath, { baseUrl, ...scan });

		expect(invalid).toStrictEqual([]);
		expect([...names].toSorted((first, second) => first.localeCompare(second))).toStrictEqual([
			'a/b-1-1200.jpg',
			'a/b-1-1800.jpg',
			'a/b-1-350x233.webp',
		]);
	});

	test('a URL under the base outside the grammar is flagged', async () => {
		writeOutputFile('rss.xml', `&lt;img src=&quot;${baseUrl}/a/b.jpg&quot;`);

		const { invalid, names } = await scanImageNames(outputPath, { baseUrl, ...scan });

		expect(invalid).toStrictEqual(['a/b.jpg']);
		expect(names.size).toBe(0);
	});

	test('a root-relative base matches only under its own prefix', async () => {
		writeOutputFile('index.html', '<img src="/_img/a/b-450.jpg"><img src="/other/a/c-450.jpg">');

		const { names } = await scanImageNames(outputPath, { baseUrl: '/_img/' });

		expect([...names]).toStrictEqual(['a/b-450.jpg']);
	});
});
