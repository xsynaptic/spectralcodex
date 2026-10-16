import type { CollectionEntry } from 'astro:content';

import { getPublicId } from '@spectralcodex/shared/entries';
import { IMAGE_SERVER_SECRET } from 'astro:env/server';
import { hash } from 'ohash';

import type { ImageThumbnail } from '#lib/schemas/index.ts';

import { hashShortLength, imageLowQualityFormat, imageLowQualityValue } from '#constants.ts';
import { getImageByIdFunction } from '#lib/collections/images/images-utils.ts';
import {
	createGenerateLocationPostDataFunction,
	getLocationThumbnailProps,
} from '#lib/collections/locations/locations-factory.ts';
import { createGenerateNearbyItemsFunction } from '#lib/collections/locations/locations-nearby.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { getImageFeaturedId } from '#lib/image/image-featured.ts';
import { createSignedImagePathFunction } from '#lib/image/image-server.ts';
import { getMatchingLinkUrl } from '#lib/schemas/resources.ts';
import {
	createCollectionData,
	createCollectionLookupByIds,
	getRawCollection,
} from '#lib/utils/collections.ts';
import { contentPolicy } from '#lib/utils/content-policy.ts';
import { getDescriptionRendered } from '#lib/utils/description-data.ts';
import { getDescription } from '#lib/utils/description.ts';
import { getContentPath } from '#lib/utils/routing.ts';

const getSignedImagePath = createSignedImagePathFunction({
	imageFormat: imageLowQualityFormat,
	imageQuality: imageLowQualityValue,
	serverSecret: IMAGE_SERVER_SECRET,
});

type GetThumbnailFunction = (imageId: string | undefined) => ImageThumbnail | undefined;

async function generateLocationImageData(locations: Array<CollectionEntry<'locations'>>) {
	const getImageById = await getImageByIdFunction();

	const getThumbnail: GetThumbnailFunction = (imageId) => {
		const imageEntry = getImageById(imageId);

		return imageEntry
			? getLocationThumbnailProps(imageEntry.id, imageEntry.data.width, getSignedImagePath)
			: undefined;
	};

	for (const entry of locations) {
		setEntryThumbnail(entry, getThumbnail);
		setGeometryThumbnails(entry, getThumbnail);
	}
}

function generateLocationMapData(entry: CollectionEntry<'locations'>) {
	const locationMapDataHash = hash({
		description: getDescription(entry),
		id: entry.id,
		links: entry.data.links,
		title: entry.data.title,
	}).slice(0, hashShortLength);

	entry.data._uuid = locationMapDataHash;
	entry.data._url = getContentPath('locations', getPublicId(entry));
	entry.data._googleMapsUrl = getMatchingLinkUrl('maps.app.goo.gl', entry.data.links);
	entry.data._wikipediaUrl = getMatchingLinkUrl('wikipedia.org', entry.data.links);

	const rendered = getDescriptionRendered(entry);

	if (rendered) {
		entry.data._descriptionHtml = rendered.html;
	}
}

function setEntryThumbnail(
	entry: CollectionEntry<'locations'>,
	getThumbnail: GetThumbnailFunction,
) {
	if (!entry.data.imageFeatured) return;

	const thumbnail = getThumbnail(getImageFeaturedId({ imageFeatured: entry.data.imageFeatured }));

	if (thumbnail) {
		entry.data._imageThumbnail = thumbnail;
	}
}

function setGeometryThumbnails(
	entry: CollectionEntry<'locations'>,
	getThumbnail: GetThumbnailFunction,
) {
	if (!Array.isArray(entry.data.geometry)) return;

	for (const geometry of entry.data.geometry) {
		if (geometry.imageFeatured === null) {
			// eslint-disable-next-line unicorn/no-null -- overrides the entry `imageFeatured` to render no thumbnail
			geometry._imageThumbnail = null;
			continue;
		}

		if (!geometry.imageFeatured) continue;

		const thumbnail = getThumbnail(geometry.imageFeatured);

		if (thumbnail) {
			geometry._imageThumbnail = thumbnail;
		}
	}
}

export const getLocationsCollection = createCollectionData({
	collection: 'locations',
	label: 'Locations',
	async mutate(entries) {
		if (contentPolicy.applyOverrides) {
			for (const entry of entries) {
				if (!entry.data.override) continue;

				const { id: _, ...overrideFields } = entry.data.override;

				Object.assign(entry.data, overrideFields);
			}
		}

		const nearbyCandidates = contentPolicy.hideSensitiveLocations
			? entries.filter((location) => !location.data.hideLocation)
			: entries;

		const posts = await getRawCollection('posts');
		const generateLocationPostData = createGenerateLocationPostDataFunction(posts);
		const generateNearbyItems = createGenerateNearbyItemsFunction(nearbyCandidates);

		for (const entry of entries) {
			generateLocationPostData(entry);
			generateLocationMapData(entry);
			generateNearbyItems(entry);
		}

		await generateLocationImageData(entries);
	},
});

export const createLocationsByIdsFunction = createCollectionLookupByIds(
	'Locations',
	getLocationsCollection,
);

export async function createLocationsByPostsFunction() {
	const { entriesMap: locationsMap } = await getLocationsCollection();

	return function getLocationsByPosts(
		...posts: Array<CollectionEntry<'posts'>>
	): Array<CollectionEntry<'locations'>> {
		const ids = [
			...new Set(posts.flatMap((post) => post.data.locations?.map((entry) => entry.id) ?? [])),
		];

		return ids
			.map((id) => locationsMap.get(id))
			.filter((entry): entry is CollectionEntry<'locations'> => !!entry);
	};
}

export async function createLocationsBySeriesFunction() {
	const { entriesMap: locationsMap } = await getLocationsCollection();
	const { entriesMap: postsMap } = await getPostsCollection();

	const getLocationsByPosts = await createLocationsByPostsFunction();

	return function getLocationsBySeries(
		seriesItemIds: Array<string> | undefined,
	): Array<CollectionEntry<'locations'>> {
		if (!seriesItemIds || seriesItemIds.length === 0) return [];

		const seriesLocationsMap = new Map<string, CollectionEntry<'locations'>>();

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
