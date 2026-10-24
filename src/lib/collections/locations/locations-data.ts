import type { CollectionEntry } from 'astro:content';

import { getPublicId } from '@spectralcodex/shared/entries';
import * as R from 'remeda';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';
import type { ImageThumbnail } from '#lib/collections/locations/locations-factory.ts';

import { getImageByIdFunction, getImageSource } from '#lib/collections/images/images-data.ts';
import {
	createLocationPostsFunction,
	getLocationThumbnailProps,
} from '#lib/collections/locations/locations-factory.ts';
import { createLocationNearbyFunction } from '#lib/collections/locations/locations-nearby.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { getImageFeaturedId } from '#lib/image/image-featured.ts';
import { createImagePathFunction } from '#lib/image/image-url.ts';
import { getMatchingLinkUrl } from '#lib/schemas/resources.ts';
import {
	createCollectionData,
	createCollectionLookupByIds,
	getRawCollection,
} from '#lib/utils/collections.ts';
import {
	contentPolicy,
	getEffectiveLocationData,
	isGeometryHidden,
} from '#lib/utils/content-policy.ts';
import { getDescriptionRendered } from '#lib/utils/description-data.ts';
import { getContentPath } from '#lib/utils/routing.ts';

type GetThumbnailFunction = (imageId: string | undefined) => ImageThumbnail | undefined;

export type LocationPoint = Exclude<
	CollectionEntry<'locations'>['data']['geometry'],
	Array<unknown>
> & { _imageThumbnail?: ImageThumbnail | null };

async function createThumbnailFunction(): Promise<GetThumbnailFunction> {
	const getImageById = await getImageByIdFunction();

	return function getThumbnail(imageId) {
		const imageEntry = getImageById(imageId);

		if (!imageEntry) return;

		const imageSource = getImageSource(imageEntry);

		// Popup thumbnails are stored as paths; the popup prepends the image base URL at render time
		return getLocationThumbnailProps(
			imageSource,
			createImagePathFunction({ imageSource, preset: 'popup' }),
		);
	};
}

function getEntryThumbnail(
	data: CollectionEntry<'locations'>['data'],
	getThumbnail: GetThumbnailFunction,
) {
	if (!data.imageFeatured) return;

	return getThumbnail(getImageFeaturedId({ imageFeatured: data.imageFeatured }));
}

function getPointThumbnail(point: LocationPoint, getThumbnail: GetThumbnailFunction) {
	// eslint-disable-next-line unicorn/no-null -- overrides the entry `imageFeatured` to render no thumbnail
	if (point.imageFeatured === null) return null;

	return point.imageFeatured ? getThumbnail(point.imageFeatured) : undefined;
}

function getGeometryWithThumbnails(
	geometry: CollectionEntry<'locations'>['data']['geometry'],
	getThumbnail: GetThumbnailFunction,
): Array<LocationPoint> | LocationPoint {
	if (!Array.isArray(geometry)) return geometry;

	return geometry.map((point) => {
		const thumbnail = getPointThumbnail(point, getThumbnail);

		return thumbnail === undefined ? { ...point } : { ...point, _imageThumbnail: thumbnail };
	});
}

export const getLocationsCollection = createCollectionData({
	collection: 'locations',
	async compute(entries) {
		const nearbyCandidates = contentPolicy.hideSensitiveLocations
			? entries.filter((location) => !isGeometryHidden(location))
			: entries;

		const posts = await getRawCollection('posts');
		const getThumbnail = await createThumbnailFunction();
		const getLocationPosts = createLocationPostsFunction(posts);
		const getLocationNearby = createLocationNearbyFunction(nearbyCandidates);

		return function computeLocation(entry: CollectionEntry<'locations'>) {
			const data = getEffectiveLocationData(entry.data);

			return {
				...data,
				...getLocationPosts(entry),
				_descriptionHtml: getDescriptionRendered({ body: entry.body, data, id: entry.id })?.html,
				_googleMapsUrl: getMatchingLinkUrl('maps.app.goo.gl', data.links),
				_imageThumbnail: getEntryThumbnail(data, getThumbnail),
				_nearby: getLocationNearby(entry),
				_url: getContentPath('locations', getPublicId(entry)),
				_wikipediaUrl: getMatchingLinkUrl('wikipedia.org', data.links),
				geometry: getGeometryWithThumbnails(data.geometry, getThumbnail),
			};
		};
	},
	label: 'Locations',
});

export const createLocationsByIdsFunction = createCollectionLookupByIds(
	'Locations',
	getLocationsCollection,
);

export async function createLocationsByPostsFunction() {
	const { entriesMap: locationsMap } = await getLocationsCollection();

	return function getLocationsByPosts(
		...posts: Array<CollectionEntry<'posts'>>
	): Array<ComputedEntry<'locations'>> {
		const ids = [
			...new Set(posts.flatMap((post) => post.data.locations?.map((entry) => entry.id) ?? [])),
		];

		return ids.map((id) => locationsMap.get(id)).filter(R.isNonNullish);
	};
}

export async function createLocationsBySeriesFunction() {
	const { entriesMap: locationsMap } = await getLocationsCollection();
	const { entriesMap: postsMap } = await getPostsCollection();

	const getLocationsByPosts = await createLocationsByPostsFunction();

	return function getLocationsBySeries(
		seriesItemIds: Array<string> | undefined,
	): Array<ComputedEntry<'locations'>> {
		if (!seriesItemIds || seriesItemIds.length === 0) return [];

		const seriesLocationsMap = new Map<string, ComputedEntry<'locations'>>();

		for (const seriesItemId of seriesItemIds) {
			const location = locationsMap.get(seriesItemId);

			if (location) {
				seriesLocationsMap.set(seriesItemId, location);
				continue;
			}

			const post = postsMap.get(seriesItemId);

			if (!post) throw new Error(`[Series] Requested item "${seriesItemId}" not found!`);

			for (const seriesPostLocation of getLocationsByPosts(post)) {
				seriesLocationsMap.set(seriesPostLocation.id, seriesPostLocation);
			}
		}

		return [...seriesLocationsMap.values()];
	};
}
