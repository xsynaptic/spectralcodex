import type { ContentEntry, ValidationResult } from '@xsynaptic/astro-scripts';

import { findStemCollisions } from '@xsynaptic/astro-image-pipeline/names';
import { toValidationResult } from '@xsynaptic/astro-scripts';

import { getEntryImageIds, listMediaImages } from '#shared/image-references.ts';

interface MissingImageIssue {
	imageId: string;
	location: string;
}

export function validateImageReferences(entries: Array<ContentEntry>, mediaPath: string) {
	const mediaFiles = listMediaImages(mediaPath);

	if (mediaFiles.size === 0) {
		return {
			issues: [],
			status: 'warn',
			summary: `No image files found in ${mediaPath}`,
		} satisfies ValidationResult;
	}

	const missing = collectMissingImageIssues(entries, mediaFiles);
	const collisions = findStemCollisions(mediaFiles);

	return toValidationResult(
		[
			...missing.map(({ imageId, location }) => ({
				location,
				message: `missing image "${imageId}"`,
			})),
			...collisions.map((files) => ({
				location: files.join(', '),
				message: 'one stem, so their image names collide',
			})),
		],
		{
			fail: `Found ${missing.length.toString()} missing image reference(s) and ${collisions.length.toString()} shared stem(s)`,
			pass: `${mediaFiles.size.toString()} image references valid`,
		},
	);
}

function collectMissingImageIssues(entries: Array<ContentEntry>, mediaFiles: ReadonlySet<string>) {
	const issues: Array<MissingImageIssue> = [];

	for (const entry of entries) {
		const { body, featured } = getEntryImageIds(entry);
		const imageIds = new Set([...featured, ...body]);

		for (const imageId of imageIds) {
			if (mediaFiles.has(imageId)) continue;

			issues.push({ imageId, location: entry.filePath ?? entry.id });
		}
	}

	return issues;
}
