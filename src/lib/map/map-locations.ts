import type {
	MapFeatureProperties,
	MapFeaturesRule,
	MapPopupItem,
	MapSourceItem,
} from '@spectralcodex/map-codec';
import type { CollectionEntry } from 'astro:content';
import type { Feature, Position } from 'geojson';

import {
	MapPopupOwnField,
	pickMapPopupProperties,
	pickMapSourceProperties,
} from '@spectralcodex/map-codec';
import { getPublicId } from '@spectralcodex/shared/entries';
import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { stripDiacritics } from '@spectralcodex/shared/text';

import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';

import { mapDisplayRegionIds, mapPointIdSeparator } from '#constants.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getTruncatedLngLat } from '#lib/map/map-utils.ts';
import { isGeometryHidden } from '#lib/utils/content-policy.ts';

type LocationGeometry = Exclude<CollectionEntry<'locations'>['data']['geometry'], Array<unknown>>;

export type MapLocationFeature = Feature<MapSourceItem['geometry'], MapFeatureProperties> & {
	id: string;
};

interface LocationFeaturesOptions {
	includeHidden?: boolean | undefined;
}

export function getLocationFeatureIds(entry: CollectionEntry<'locations'>): Array<string> {
	const publicId = getPublicId(entry);
	const geometryArray = Array.isArray(entry.data.geometry)
		? entry.data.geometry
		: [entry.data.geometry];

	return geometryArray.length > 1
		? [...geometryArray.keys()].map((index) => `${publicId}${mapPointIdSeparator}${String(index)}`)
		: [publicId];
}

function getMapPosition(coordinates: Position, featureId: string): [number, number] {
	const [lng, lat] = coordinates;

	if (typeof lng !== 'number' || typeof lat !== 'number') {
		throw new TypeError(`Malformed coordinates for map feature "${featureId}"`);
	}

	return getTruncatedLngLat([lng, lat]);
}

function getRelativePath(url: string | undefined): string | undefined {
	if (!url) return undefined;
	if (url.startsWith('/')) return url;
	return new URL(url).pathname;
}

// Shared across every region and theme map; safe only because output depends on nothing but the entry
const locationFeaturesCache = new WeakMap<
	CollectionEntry<'locations'>,
	Array<MapLocationFeature>
>();

export function getLocationFeatures(
	locations: Array<CollectionEntry<'locations'>>,
	options?: LocationFeaturesOptions,
): Array<MapLocationFeature> {
	const shown = options?.includeHidden ? locations : filterHiddenLocations(locations);

	return shown
		.flatMap((entry) => buildLocationFeatures(entry))
		.toSorted((a, b) => a.id.localeCompare(b.id));
}

export function getLocationsMapRule(locations: Array<CollectionEntry<'locations'>>) {
	return {
		ids: filterHiddenLocations(locations).flatMap((entry) => getLocationFeatureIds(entry)),
		type: 'ids',
	} satisfies MapFeaturesRule;
}

export function isEntryMapEnabled(
	entry: CollectionEntry<'posts' | 'regions' | 'series' | 'themes'>,
) {
	switch (entry.collection) {
		// Posts and Series cannot turn their map off; one still appears only when their Locations are mapped
		case 'posts':
		case 'series': {
			return true;
		}
		case 'regions': {
			return (
				mapDisplayRegionIds.has(entry.id) ||
				(entry.data._ancestors?.some((ancestor) => mapDisplayRegionIds.has(ancestor)) ?? false)
			);
		}
		case 'themes': {
			return !entry.data.hideMap;
		}
	}
}

export function getRegionMapRule(
	intervalById: ReadonlyMap<string, [number, number]>,
	id: string,
): MapFeaturesRule {
	const interval = intervalById.get(id);

	if (!interval) throw new Error(`No region interval for "${id}"`);

	return { interval, type: 'region' };
}

export function getThemeMapRule(
	themeIndexById: ReadonlyMap<string, number>,
	id: string,
): MapFeaturesRule {
	const index = themeIndexById.get(id);

	if (index === undefined) throw new Error(`No theme index for "${id}"`);

	return { index, type: 'theme' };
}

function filterHiddenLocations(locations: Array<CollectionEntry<'locations'>>) {
	return locations.filter((entry) => !isGeometryHidden(entry));
}

export function getLocationsMapPopupData(
	features: ReadonlyArray<MapLocationFeature>,
): Array<MapPopupItem> {
	return features.map((feature) => {
		return {
			...pickMapPopupProperties(feature.properties),
			id: feature.id,
			title: stripDiacritics(feature.properties.title),
			...(feature.properties.image === undefined
				? {}
				: { image: { srcSet: feature.properties.image.srcSet } }),
		} satisfies MapPopupItem;
	});
}

export function getLocationsMapSourceData(
	features: ReadonlyArray<MapLocationFeature>,
): Array<MapSourceItem> {
	return features.map((feature) => {
		const { titleMultilingualValue } = feature.properties;

		return {
			geometry: {
				coordinates: getMapPosition(feature.geometry.coordinates, feature.id),
				type: GeometryTypeEnum.Point,
			},
			properties: {
				...pickMapSourceProperties(feature.properties),
				hasImage: feature.properties.image !== undefined,
				id: feature.id,
				title: stripDiacritics(feature.properties.title),
				...(titleMultilingualValue === undefined
					? {}
					: { titleMultilingual: stripDiacritics(titleMultilingualValue) }),
				...(feature.properties.pointTitle === undefined
					? {}
					: { pointTitle: stripDiacritics(feature.properties.pointTitle) }),
			},
			type: 'Feature',
		} satisfies MapSourceItem;
	});
}

function buildLocationFeatures(entry: CollectionEntry<'locations'>): Array<MapLocationFeature> {
	const cached = locationFeaturesCache.get(entry);

	if (cached) return cached;

	const geometryArray = Array.isArray(entry.data.geometry)
		? entry.data.geometry
		: [entry.data.geometry];
	const featureIds = getLocationFeatureIds(entry);
	const entryTitleMultilingual = getMultilingualContent({
		data: entry.data,
		prop: 'title',
	})?.primary;
	const entryProperties = getEntryFeatureProperties(entry);

	const features = geometryArray.map((geometry, index) => ({
		geometry: {
			coordinates: geometry.coordinates,
			type: GeometryTypeEnum.Point,
		},
		id: featureIds[index] ?? entry.id,
		properties: {
			...entryProperties,
			...getFeatureTitleProperties({
				entry,
				entryTitleMultilingual,
				geometry,
				isMultiPoint: geometryArray.length > 1,
			}),
			...getGeometryFeatureProperties(entry, geometry, geometryArray.length > 1),
		},
		type: 'Feature' as const,
	}));

	locationFeaturesCache.set(entry, features);

	return features;
}

function getEntryFeatureProperties(entry: CollectionEntry<'locations'>) {
	return {
		entryQuality: entry.data.entryQuality,
		objective: entry.data.objective,
		outlier: entry.data.outlier,
		rating: entry.data.rating,
		url: getRelativePath(entry.data._url),
	};
}

function getFeatureTitleProperties({
	entry,
	entryTitleMultilingual,
	geometry,
	isMultiPoint,
}: {
	entry: CollectionEntry<'locations'>;
	entryTitleMultilingual: MultilingualContent | undefined;
	geometry: LocationGeometry;
	isMultiPoint: boolean;
}) {
	const geometryTitleMultilingual = getMultilingualContent({
		data: geometry,
		prop: 'title',
	})?.primary;
	const pointTitle = isMultiPoint
		? getPointTitle(geometry.title, geometryTitleMultilingual)
		: undefined;

	return {
		title: geometry.title ? `${entry.data.title}: ${geometry.title}` : entry.data.title,
		...getMultilingualTitleProperties(entryTitleMultilingual, geometryTitleMultilingual),
		...(pointTitle === undefined ? {} : { pointTitle }),
	};
}

function getPointTitle(title: string | undefined, multilingual: MultilingualContent | undefined) {
	if (title === undefined) return multilingual?.value;
	if (multilingual === undefined) return title;

	return `${title} (${multilingual.value})`;
}

function getGeometryFeatureProperties(
	entry: CollectionEntry<'locations'>,
	geometry: LocationGeometry,
	isMultiPoint: boolean,
) {
	const image = (geometry._imageThumbnail === undefined ? entry.data : geometry)._imageThumbnail;

	return {
		description: geometry.description ?? entry.data._descriptionHtml,
		precision: geometry.precision ?? entry.data.precision,
		status: geometry.status ?? entry.data.status,
		...getGeometryLinkProperties(entry, geometry, isMultiPoint),
		...(image === null ? {} : { image }),
		...(isMultiPoint ? getOwnProperties(geometry) : {}),
	};
}

function getGeometryLinkProperties(
	entry: CollectionEntry<'locations'>,
	geometry: LocationGeometry,
	isMultiPoint: boolean,
) {
	const googleMapsUrl = isMultiPoint
		? geometry.googleMapsUrl
		: (geometry.googleMapsUrl ?? entry.data._googleMapsUrl);

	return {
		googleMapsUrl,
		wikipediaUrl: geometry.wikipediaUrl ?? entry.data._wikipediaUrl,
	};
}

function getMultilingualTitleProperties(
	entryTitle: MultilingualContent | undefined,
	geometryTitle: MultilingualContent | undefined,
) {
	if (!entryTitle) return {};

	return {
		titleMultilingualLang: entryTitle.lang,
		titleMultilingualValue: geometryTitle
			? `${entryTitle.value}：${geometryTitle.value}`
			: entryTitle.value,
	};
}

function getOwnProperties(geometry: LocationGeometry) {
	const own =
		(geometry.description ? MapPopupOwnField.Description : 0) |
		(geometry._imageThumbnail ? MapPopupOwnField.Image : 0) |
		(geometry.wikipediaUrl ? MapPopupOwnField.Wikipedia : 0) |
		(geometry.precision === undefined ? 0 : MapPopupOwnField.Precision);

	return own === 0 ? {} : { own };
}
