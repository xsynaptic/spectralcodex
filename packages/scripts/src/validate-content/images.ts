import { getImageStem } from '@xsynaptic/astro-image-pipeline/names';

import type { ContentEntry } from '#shared/astro-content.ts';
import type { ValidationResult } from '#validate-content/validation-result.ts';

import { getEntryImageIds, listMediaImages } from '#shared/image-references.ts';
import { toValidationResult } from '#validate-content/validation-result.ts';

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
	const collisions = collectStemCollisions(mediaFiles);

	return toValidationResult(
		[
			...missing.map(({ imageId, location }) => ({
				message: `${location}: missing image "${imageId}"`,
			})),
			...collisions.map((files) => ({
				message: `${files.join(', ')}: one stem, so their image names collide`,
			})),
		],
		{
			fail: `Found ${missing.length.toString()} missing image reference(s) and ${collisions.length.toString()} shared stem(s)`,
			pass: `${mediaFiles.size.toString()} image references valid`,
		},
	);
}

// Image names drop the file extension, so a.jpg beside a.png (or A.png on macOS) would get the same names
function collectStemCollisions(mediaFiles: ReadonlySet<string>) {
	const filesByStem = Map.groupBy(mediaFiles, (file) => getImageStem(file).toLowerCase());

	return [...filesByStem.values()]
		.filter((files) => files.length > 1)
		.map((files) => files.toSorted((first, second) => first.localeCompare(second)));
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
