import type { OpenGraphContentEntry } from './types.ts';

export interface ImageBatch {
	imageId: string;
	isFallback: boolean;
	entries: Array<OpenGraphContentEntry>;
}

// One decode serves every entry sharing a source image; the fallback blur makes a separate draw
export function batchEntriesBySourceImage(
	entries: Array<OpenGraphContentEntry>,
): Array<ImageBatch> {
	const batches = new Map<string, ImageBatch>();

	for (const entry of entries) {
		const batchKey = `${entry.imageFeaturedId}:${String(entry.isFallback)}`;
		const batch = batches.get(batchKey);

		if (batch) {
			batch.entries.push(entry);
			continue;
		}

		batches.set(batchKey, {
			imageId: entry.imageFeaturedId,
			isFallback: entry.isFallback,
			entries: [entry],
		});
	}

	return [...batches.values()];
}

// A card goes stale when its content, its source image, or the template changes
export function getOutputCacheKey({
	digest,
	imageId,
	imageModifiedTime,
}: {
	digest: string;
	imageId: string;
	imageModifiedTime: number | undefined;
}): string {
	return `${digest}:${imageId}:${String(imageModifiedTime ?? '')}`;
}
