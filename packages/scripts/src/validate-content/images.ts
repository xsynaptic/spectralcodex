import type { ContentEntry } from '#shared/astro-content.ts';
import type { ValidationResult } from '#validate-content/validation-result.ts';

import { collectMediaFiles, extractImageFeaturedIds, extractMdxImageIds } from '#shared/images.ts';
import { toValidationResult } from '#validate-content/validation-result.ts';

interface MissingImageIssue {
	imageId: string;
	location: string;
}

export function validateImageReferences(entries: Array<ContentEntry>, mediaPath: string) {
	const mediaFiles = collectMediaFiles(mediaPath);

	if (mediaFiles.size === 0) {
		return {
			issues: [],
			status: 'warn',
			summary: `No image files found in ${mediaPath}`,
		} satisfies ValidationResult;
	}

	const issues = collectMissingImageIssues(entries, mediaFiles);

	return toValidationResult(
		issues.map(({ imageId, location }) => ({ message: `${location}: missing image "${imageId}"` })),
		{
			fail: `Found ${issues.length.toString()} missing image reference(s)`,
			pass: `${mediaFiles.size.toString()} image references valid`,
		},
	);
}

function collectMissingImageIssues(entries: Array<ContentEntry>, mediaFiles: ReadonlySet<string>) {
	const issues: Array<MissingImageIssue> = [];

	for (const entry of entries) {
		const frontmatterIds = extractImageFeaturedIds(entry.data);
		const mdxIds = entry.body ? extractMdxImageIds(entry.body) : [];
		const imageIds = new Set([...frontmatterIds, ...mdxIds]);

		for (const imageId of imageIds) {
			if (mediaFiles.has(imageId)) continue;

			issues.push({ imageId, location: entry.filePath ?? entry.id });
		}
	}

	return issues;
}
