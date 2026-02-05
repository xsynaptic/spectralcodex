#!/usr/bin/env tsx
/**
 * Extract image URLs from built HTML for cache warming
 * Run after `astro build` to generate a manifest of all image URLs
 *
 * Supports incremental manifests:
 * - Loads existing main manifest (if provided) to track known URLs
 * - Outputs full manifest (cache-manifest.json) and new-only manifest (cache-manifest-new.json)
 * - Updates main manifest with all discovered URLs
 */
import dotenv from 'dotenv';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

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

export function generateManifest(options: {
	distPath: string;
	outputPath: string;
	urlPattern: string; // Image server URL pattern (e.g., IPX_SERVER_URL from .env)
	mainPath?: string; // Path to persistent main manifest for incremental updates
}): {
	total: number;
	newCount: number;
	existingCount: number;
} {
	const { distPath, outputPath, urlPattern, mainPath } = options;

	const startTime = performance.now();
	const imageUrls = new Set<string>();
	const htmlFiles = findHtmlFiles(distPath);

	console.log(`Scanning ${String(htmlFiles.length)} HTML files...`);

	const escapedPattern = urlPattern.replaceAll('.', String.raw`\.`);
	const urlRegex = new RegExp(
		String.raw`${escapedPattern}/[^"'\s]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'\s]*)?`,
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

	// Load main manifest for incremental comparison
	let mainUrls = new Set<string>();

	if (mainPath && existsSync(mainPath)) {
		const mainData = JSON.parse(readFileSync(mainPath, 'utf8')) as Array<string>;
		mainUrls = new Set(mainData);
		console.log(`Loaded main manifest with ${String(mainUrls.size)} URLs`);
	}

	// Find new URLs not in main manifest
	const newUrls = sortedUrls.filter((url) => !mainUrls.has(url));
	const existingCount = sortedUrls.length - newUrls.length;

	// Write full manifest
	// eslint-disable-next-line unicorn/no-null
	writeFileSync(outputPath, JSON.stringify(sortedUrls, null, 2));

	// Write new-only manifest
	const newOutputPath = outputPath.replace('cache-manifest.json', 'cache-manifest-new.json');

	// eslint-disable-next-line unicorn/no-null
	writeFileSync(newOutputPath, JSON.stringify(newUrls, null, 2));

	// Update main manifest with all URLs (merge new into main)
	if (mainPath) {
		const mainDir = path.dirname(mainPath);
		if (!existsSync(mainDir)) {
			mkdirSync(mainDir, { recursive: true });
		}
		// eslint-disable-next-line unicorn/no-null
		writeFileSync(mainPath, JSON.stringify(sortedUrls, null, 2));
	}

	const elapsed = Math.round(performance.now() - startTime);
	console.log(`Found ${String(sortedUrls.length)} unique image URLs in ${String(elapsed)}ms`);
	if (newUrls.length > 0) {
		console.log(`  - ${String(newUrls.length)} new URLs (written to cache-manifest-new.json)`);
		console.log(`  - ${String(existingCount)} existing URLs`);
	} else {
		console.log('  - No new URLs found');
	}
	if (mainPath) {
		console.log('Updated main manifest');
	}

	return { total: sortedUrls.length, newCount: newUrls.length, existingCount };
}

// CLI entry point
if (process.argv[1]?.endsWith('manifest.ts')) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'root-path': { type: 'string', default: process.cwd() },
			'dist-path': { type: 'string', default: 'dist' },
			'output-path': { type: 'string', default: 'dist/cache-manifest.json' },
			'url-pattern': { type: 'string' },
			'main-path': { type: 'string' },
		},
	});

	const rootPath = values['root-path'];

	// Load environment variables
	dotenv.config({ path: path.join(rootPath, '.env'), quiet: true });

	// URL pattern from args or environment
	const urlPattern = values['url-pattern'] ?? process.env.IPX_SERVER_URL;
	if (!urlPattern) {
		console.error('Error: URL pattern required. Set IPX_SERVER_URL in .env or pass --url-pattern');
		process.exit(1);
	}

	generateManifest({
		distPath: values['dist-path'],
		outputPath: values['output-path'],
		urlPattern,
		...(values['main-path'] && { mainPath: values['main-path'] }),
	});
}
