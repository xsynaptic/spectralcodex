import { describe, expect, test } from 'vitest';

import type { GetImagePathFunction } from '#lib/collections/locations/locations-factory.ts';

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

const stubPath: GetImagePathFunction = (width) => `img-${String(width)}`;

describe('getLocationThumbnailProps', () => {
	test('wide sources get both 350w and 700w candidates', () => {
		expect(getLocationThumbnailProps({ height: 800, width: 1200 }, stubPath)).toEqual([
			{ path: 'img-350', width: 350 },
			{ path: 'img-700', width: 700 },
		]);
	});

	test('candidates the source cannot fill are dropped, never upscaled', () => {
		expect(getLocationThumbnailProps({ height: 400, width: 1200 }, stubPath)).toEqual([
			{ path: 'img-350', width: 350 },
		]);
	});

	test('a source too small for the smallest candidate gets no thumbnail', () => {
		expect(getLocationThumbnailProps({ height: 200, width: 300 }, stubPath)).toBeUndefined();
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
