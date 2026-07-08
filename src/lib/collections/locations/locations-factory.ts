import type { ImagorOperations } from '@xsynaptic/unpic-imagor';
import type { CollectionEntry } from 'astro:content';

import type { ImageThumbnail } from '#lib/schemas/index.ts';

import { ImageFitOptionEnum } from '#lib/image/image-types.ts';

// Structural signer type; importing image-server would pull astro:env into tests
export type GetSignedImagePathFunction = (
	src: string | URL,
	operations: ImagorOperations,
) => string;

export function createGenerateLocationPostDataFunction(posts: Array<CollectionEntry<'posts'>>) {
	// _posts must preserve posts-collection order
	const postIdsByLocationId = new Map<string, Array<string>>();

	for (const post of posts) {
		if (!post.data.locations) continue;

		// A repeated location ref within a post must not double-count
		const uniqueLocationIds = new Set(post.data.locations.map((location) => location.id));

		for (const locationId of uniqueLocationIds) {
			const postIds = postIdsByLocationId.get(locationId);

			if (postIds) {
				postIds.push(post.id);
			} else {
				postIdsByLocationId.set(locationId, [post.id]);
			}
		}
	}

	return function getLocationPostData(entry: CollectionEntry<'locations'>) {
		entry.data._posts = postIdsByLocationId.get(entry.id) ?? [];
		entry.data._postCount = entry.data._posts.length;
	};
}

/**
 * Generate thumbnail data with srcSet for map popups
 * We pass this data via the API so URLs can be signed at build time
 */
const imageThumbnailOptions = {
	width: 350,
	aspectRatio: 3 / 2,
	widths: [350, 700],
};

export function getLocationThumbnailProps(
	imageSrc: string,
	sourceWidth: number,
	getSignedImagePath: GetSignedImagePathFunction,
): ImageThumbnail {
	const { aspectRatio, width, widths } = imageThumbnailOptions;
	const fit = ImageFitOptionEnum.Cover;

	const buildCandidate = (candidateWidth: number) => {
		const height = Math.round(candidateWidth / aspectRatio);
		const path = getSignedImagePath(imageSrc, { width: candidateWidth, height, fit });
		return `${path} ${String(candidateWidth)}w`;
	};

	// Never upscale; fall back to the (clamped) source width when it is below our smallest target
	const candidateWidths = widths.filter((candidate) => candidate <= sourceWidth);
	const resolvedWidths =
		candidateWidths.length > 0 ? candidateWidths : [Math.min(width, sourceWidth)];

	return {
		srcSet: resolvedWidths.map(buildCandidate).join(', '),
	};
}
