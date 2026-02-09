#!/usr/bin/env tsx
import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

import { collectMediaFiles, extractImageFeaturedIds, extractMdxImageIds } from '../shared/images';

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
