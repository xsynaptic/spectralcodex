import type { MapPopupItem } from '@spectralcodex/map-codec';
import type { CollectionEntry } from 'astro:content';

import { getImagePresetWidths } from '@spectralcodex/shared/images';

export type ImageThumbnail = NonNullable<MapPopupItem['image']>;

// Structural type; importing image-url would pull astro:env into tests
export type GetImagePathFunction = (width: number) => string;

export function createLocationPostsFunction(posts: Array<CollectionEntry<'posts'>>) {
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

	return function getLocationPosts(entry: CollectionEntry<'locations'>) {
		const postIds = postIdsByLocationId.get(entry.id) ?? [];

		return { _postCount: postIds.length, _posts: postIds };
	};
}

export function getLocationThumbnailProps(
	source: { height: number; width: number },
	getImagePath: GetImagePathFunction,
): ImageThumbnail | undefined {
	const widths = getImagePresetWidths('popup', source);

	if (widths.length === 0) return;

	return { srcSet: widths.map((width) => `${getImagePath(width)} ${String(width)}w`).join(', ') };
}
