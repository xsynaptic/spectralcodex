import type { CollectionEntry } from 'astro:content';

import { describe, expect, test } from 'vitest';

import type { GetSignedImagePathFunction } from '#lib/collections/locations/locations-factory.ts';

import {
	createGenerateLocationPostDataFunction,
	getLocationThumbnailProps,
} from '#lib/collections/locations/locations-factory.ts';

function makeLocation(id: string): CollectionEntry<'locations'> {
	return {
		id,
		collection: 'locations',
		data: { title: id },
	} as unknown as CollectionEntry<'locations'>;
}

function makePost(id: string, locationIds?: Array<string>): CollectionEntry<'posts'> {
	return {
		id,
		collection: 'posts',
		data: {
			title: id,
			...(locationIds === undefined
				? {}
				: { locations: locationIds.map((locationId) => ({ id: locationId })) }),
		},
	} as unknown as CollectionEntry<'posts'>;
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

describe('createGenerateLocationPostDataFunction', () => {
	test('links posts to locations preserving posts-collection order', () => {
		const posts = [
			makePost('post-early', ['temple']),
			makePost('post-unrelated', ['fort']),
			makePost('post-late', ['fort', 'temple']),
			makePost('post-no-locations'),
		];
		const generateLocationPostData = createGenerateLocationPostDataFunction(posts);
		const temple = makeLocation('temple');

		generateLocationPostData(temple);

		// _posts must follow posts-collection order
		expect(temple.data._posts).toEqual(['post-early', 'post-late']);
		expect(temple.data._postCount).toBe(2);
	});

	test('unreferenced locations get an empty list', () => {
		const generateLocationPostData = createGenerateLocationPostDataFunction([
			makePost('post-early', ['temple']),
		]);
		const ruin = makeLocation('ruin');

		generateLocationPostData(ruin);

		expect(ruin.data._posts).toEqual([]);
		expect(ruin.data._postCount).toBe(0);
	});
});
