#!/usr/bin/env tsx
/**
 * Extract image URLs from built HTML for cache warming
 * Run after `astro build` to generate a manifest of all image URLs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

interface ManifestOptions {
	distPath: string;
	outputPath: string;
	urlPattern?: string;
}

function findHtmlFiles(dir: string): Array<string> {
	const files: Array<string> = [];

	for (const entry of readdirSync(dir)) {
		const fullPath = path.join(dir, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			files.push(...findHtmlFiles(fullPath));
		} else if (entry.endsWith('.html')) {
			files.push(fullPath);
		}
	}
	return files;
}

export function generateManifest(options: ManifestOptions): number {
	const { distPath, outputPath, urlPattern = 'https://img.spectralcodex.com' } = options;

	const startTime = performance.now();
	const imageUrls = new Set<string>();
	const htmlFiles = findHtmlFiles(distPath);

	console.log(`Scanning ${String(htmlFiles.length)} HTML files...`);

	const escapedPattern = urlPattern.replaceAll('.', String.raw`\.`);
	const urlRegex = new RegExp(
		String.raw`${escapedPattern}/[^"'\s]+\.(?:jpg|jpeg|png|webp|avif)`,
		'g',
	);

	for (const file of htmlFiles) {
		const html = readFileSync(file, 'utf8');
		const matches = html.matchAll(urlRegex);

		for (const [url] of matches) {
			imageUrls.add(url.replace(urlPattern, ''));
		}
	}

	const sortedUrls = [...imageUrls].sort();

	// eslint-disable-next-line unicorn/no-null
	writeFileSync(outputPath, JSON.stringify(sortedUrls, null, 2));

	const elapsed = Math.round(performance.now() - startTime);
	console.log(`Found ${String(sortedUrls.length)} unique image URLs in ${String(elapsed)}ms`);

	return sortedUrls.length;
}

// CLI entry point
if (process.argv[1]?.endsWith('manifest.ts')) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'dist-path': { type: 'string', default: 'dist' },
			'output-path': { type: 'string', default: 'dist/cache-manifest.json' },
			'url-pattern': { type: 'string', default: 'https://img.spectralcodex.com' },
		},
	});

	generateManifest({
		distPath: values['dist-path'],
		outputPath: values['output-path'],
		urlPattern: values['url-pattern'],
	});
}
