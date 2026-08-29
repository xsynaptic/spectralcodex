import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

import { collectMediaFiles, extractImageFeaturedIds, extractMdxImageIds } from '../shared/images';

interface MissingImageIssue {
	location: string;
	imageId: string;
}

function collectMissingImageIssues(
	entries: Array<DataStoreEntry>,
	mediaFiles: ReadonlySet<string>,
) {
	const issues: Array<MissingImageIssue> = [];

	for (const entry of entries) {
		const frontmatterIds = extractImageFeaturedIds(entry.data);
		const mdxIds = entry.body ? extractMdxImageIds(entry.body) : [];
		const imageIds = new Set([...frontmatterIds, ...mdxIds]);

		for (const imageId of imageIds) {
			if (mediaFiles.has(imageId)) continue;

			issues.push({ location: entry.filePath ?? entry.id, imageId });
		}
	}

	return issues;
}

export function checkImageReferences(entries: Array<DataStoreEntry>, mediaPath: string) {
	const mediaFiles = collectMediaFiles(mediaPath);

	if (mediaFiles.size === 0) {
		console.log(chalk.yellow(`No image files found in ${mediaPath}`));
		return true;
	}

	const issues = collectMissingImageIssues(entries, mediaFiles);

	if (issues.length === 0) {
		console.log(chalk.green(`✓ ${mediaFiles.size.toString()} image references valid`));
		return true;
	}

	for (const { location, imageId } of issues) {
		console.log(chalk.red(`❌ ${location}: missing image "${imageId}"`));
	}

	console.log(chalk.yellow(`⚠️  Found ${issues.length.toString()} missing image reference(s)`));

	return false;
}
