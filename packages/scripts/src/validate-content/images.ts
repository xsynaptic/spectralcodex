import type { ContentEntry } from '#shared/astro-content.ts';

import { collectMediaFiles, extractImageFeaturedIds, extractMdxImageIds } from '#shared/images.ts';

import type { ValidationResult } from './validation-result.ts';

import { toValidationResult } from './validation-result.ts';

interface MissingImageIssue {
	location: string;
	imageId: string;
}

function collectMissingImageIssues(entries: Array<ContentEntry>, mediaFiles: ReadonlySet<string>) {
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

export function validateImageReferences(entries: Array<ContentEntry>, mediaPath: string) {
	const mediaFiles = collectMediaFiles(mediaPath);

	if (mediaFiles.size === 0) {
		return {
			status: 'warn',
			summary: `No image files found in ${mediaPath}`,
			issues: [],
		} satisfies ValidationResult;
	}

	const issues = collectMissingImageIssues(entries, mediaFiles);

	return toValidationResult(
		issues.map(({ location, imageId }) => ({ message: `${location}: missing image "${imageId}"` })),
		{
			pass: `${mediaFiles.size.toString()} image references valid`,
			fail: `Found ${issues.length.toString()} missing image reference(s)`,
		},
	);
}
