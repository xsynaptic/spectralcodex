import { describe, expect, test } from 'vitest';

import type { GetSignedImagePathFunction } from '#lib/collections/locations/locations-factory.ts';

import { makeEntry } from '#lib/collections/collections-test-utils.ts';
import {
	createLocationPostsFunction,
	getLocationThumbnailProps,
} from '#lib/collections/locations/locations-factory.ts';

function makePost(id: string, locationIds?: Array<string>) {
	return makeEntry(
		'posts',
		id,
		locationIds === undefined
			? {}
			: { locations: locationIds.map((locationId) => ({ id: locationId })) },
	);
}

const stubSigner: GetSignedImagePathFunction = (src, operations) =>
	`/signed/${String(src)}-${String(operations.width)}x${String(operations.height)}`;

describe('getLocationThumbnailProps', () => {
	test('wide sources get both 350w and 700w candidates at 3:2', () => {
		expect(getLocationThumbnailProps('img.jpg', 1200, stubSigner)).toEqual({
			srcSet: '/signed/img.jpg-350x233 350w, /signed/img.jpg-700x467 700w',
		});
	});

	test('candidates above the source width are dropped, never upscaled', () => {
		expect(getLocationThumbnailProps('img.jpg', 500, stubSigner)).toEqual({
			srcSet: '/signed/img.jpg-350x233 350w',
		});
	});

	test('sub-350px sources fall back to a single candidate at the source width', () => {
		expect(getLocationThumbnailProps('img.jpg', 300, stubSigner)).toEqual({
			srcSet: '/signed/img.jpg-300x200 300w',
		});
	});
});

describe('createLocationPostsFunction', () => {
	test('links posts to locations preserving posts-collection order', () => {
		const posts = [
			makePost('post-early', ['temple']),
			makePost('post-unrelated', ['fort']),
			makePost('post-late', ['fort', 'temple']),
			makePost('post-no-locations'),
		];
		const getLocationPosts = createLocationPostsFunction(posts);

		// _posts must follow posts-collection order
		expect(getLocationPosts(makeEntry('locations', 'temple'))).toEqual({
			_postCount: 2,
			_posts: ['post-early', 'post-late'],
		});
	});

	test('unreferenced locations get an empty list', () => {
		const getLocationPosts = createLocationPostsFunction([makePost('post-early', ['temple'])]);

		expect(getLocationPosts(makeEntry('locations', 'ruin'))).toEqual({ _postCount: 0, _posts: [] });
	});
});
