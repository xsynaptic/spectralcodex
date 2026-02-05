#!/usr/bin/env tsx
import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import chalk from 'chalk';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import type { DataStoreEntry } from '../content-utils/data-store';

const imgRegex = /<Img(?:\s+([^>]*?))?(?:>|\/?>)/g;
const srcPropRegex = /src=["']([^"']+)["']/;

function extractImageFeaturedIds(frontmatter: Record<string, unknown>): Array<string> {
	const imageFeatured = frontmatter.imageFeatured;

	if (!imageFeatured) return [];

	const parsed = ImageFeaturedSchema.safeParse(imageFeatured);

	if (!parsed.success) return [];

	const data = parsed.data;

	if (typeof data === 'string') return [data];

	if (Array.isArray(data)) {
		return data.map((item) => (typeof item === 'string' ? item : item.id));
	}

	return [data.id];
}

function extractMdxImageIds(content: string): Array<string> {
	const ids: Array<string> = [];
	let match: RegExpExecArray | null;

	while ((match = imgRegex.exec(content)) !== null) {
		const props = match[1] || '';
		const srcMatch = srcPropRegex.exec(props);

		if (srcMatch?.[1]) {
			ids.push(srcMatch[1]);
		}
	}

	return ids;
}

function collectMediaFiles(mediaPath: string): Set<string> {
	const files = new Set<string>();

	function processDirectory(dirPath: string, prefix = '') {
		const entries = readdirSync(dirPath);

		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry);
			const relativePath = prefix ? `${prefix}/${entry}` : entry;
			const stat = statSync(fullPath);

			if (stat.isDirectory()) {
				processDirectory(fullPath, relativePath);
			} else if (/\.(jpe?g|png|webp|avif|gif)$/i.test(entry)) {
				files.add(relativePath);
			}
		}
	}

	processDirectory(mediaPath);

	return files;
}

export function checkImageReferences(entries: Array<DataStoreEntry>, mediaPath: string) {
	console.log(chalk.blue(`🔍 Checking image references against ${mediaPath}`));

	const mediaFiles = collectMediaFiles(mediaPath);

	if (mediaFiles.size === 0) {
		console.log(chalk.yellow(`No image files found in ${mediaPath}`));
		return true;
	}

	const missingImages: Array<{ file: string; imageId: string }> = [];

	for (const entry of entries) {
		const frontmatterIds = extractImageFeaturedIds(entry.data);
		const mdxIds = entry.body ? extractMdxImageIds(entry.body) : [];
		const allIds = [...new Set([...frontmatterIds, ...mdxIds])];

		for (const imageId of allIds) {
			if (!mediaFiles.has(imageId)) {
				missingImages.push({ file: entry.filePath ?? entry.id, imageId });
			}
		}
	}

	if (missingImages.length === 0) {
		console.log(chalk.green(`✓ ${mediaFiles.size.toString()} image references valid`));
		return true;
	}

	for (const { file, imageId } of missingImages) {
		console.log(chalk.red(`❌ ${file}: missing image "${imageId}"`));
	}

	console.log(
		chalk.yellow(`⚠️  Found ${missingImages.length.toString()} missing image reference(s)`),
	);

	return false;
}
