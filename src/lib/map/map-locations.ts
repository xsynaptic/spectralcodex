import type { MapPopupItem, MapSourceItem } from '@spectralcodex/map-codec';
import type { MapGeometry } from '@spectralcodex/react-map-component';
import type { CollectionEntry } from 'astro:content';
import type { Feature, FeatureCollection, Position } from 'geojson';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { stripDiacritics } from '@spectralcodex/shared/text';
import { featureCollection } from '@turf/helpers';
import { hash } from 'ohash';

import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';
import type { MapFeatureCollection, MapFeatureProperties } from '#lib/map/map-types.ts';

import { hashShortLength } from '#constants.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { contentPolicy } from '#lib/utils/content-policy.ts';

function getRelativePath(url: string | undefined): string | undefined {
	if (!url) return undefined;
	if (url.startsWith('/')) return url;
	return new URL(url).pathname;
}

function getMapGeometryCoordinatesOptimized(
	coordinates: Position,
	featureId: string,
): [number, number] {
	const [lng, lat] = coordinates;

	// A malformed position must fail the build rather than ship a marker at null island
	if (typeof lng !== 'number' || typeof lat !== 'number') {
		throw new TypeError(`Malformed coordinates for map feature "${featureId}"`);
	}

	return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
}

function getMapGeometryOptimized(geometry: MapGeometry, featureId: string) {
	const geometryType = geometry.type;

	switch (geometryType) {
		case GeometryTypeEnum.Point: {
			return {
				type: geometryType,
				coordinates: getMapGeometryCoordinatesOptimized(geometry.coordinates, featureId),
			};
		}
		case GeometryTypeEnum.LineString: {
			return {
				type: geometryType,
				coordinates: geometry.coordinates.map((position) =>
					getMapGeometryCoordinatesOptimized(position, featureId),
				),
			};
		}
		case GeometryTypeEnum.Polygon: {
			return {
				type: geometryType,
				coordinates: geometry.coordinates.map((ring) =>
					ring.map((position) => getMapGeometryCoordinatesOptimized(position, featureId)),
				),
			};
		}
		default: {
			geometryType satisfies never;
			return;
		}
	}
}

type LocationGeometry = Exclude<CollectionEntry<'locations'>['data']['geometry'], Array<unknown>>;

interface LocationsFeatureCollectionOptions {
	hideSensitiveLocations?: boolean | undefined;
}

// Multi-point locations expand to one `uuid-N` per point
export function getLocationFeatureIds(entry: CollectionEntry<'locations'>): Array<string> {
	const uuid = entry.data._uuid ?? entry.id;
	const geometryArray = Array.isArray(entry.data.geometry)
		? entry.data.geometry
		: [entry.data.geometry];

	return geometryArray.length > 1
		? [...geometryArray.keys()].map((index) => `${uuid}-${String(index)}`)
		: [uuid];
}

// Shared across every region and theme map; safe only because output depends on nothing but the entry
const locationFeaturesCache = new WeakMap<
	CollectionEntry<'locations'>,
	Array<Feature<MapGeometry, MapFeatureProperties>>
>();

const googleMapsHostPrefix = 'maps.app.goo.gl/';

function getShortenedUrl(url: string | undefined, hostPrefix?: string): string | undefined {
	if (!url) return undefined;

	const withoutScheme = url.replace('https://', '');

	return hostPrefix && withoutScheme.startsWith(hostPrefix)
		? withoutScheme.slice(hostPrefix.length)
		: withoutScheme;
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

function getEntryFeatureProperties(entry: CollectionEntry<'locations'>) {
	return {
		url: getRelativePath(entry.data._url),
		wikipediaUrl: getShortenedUrl(entry.data._wikipediaUrl),
		entryQuality: entry.data.entryQuality,
		rating: entry.data.rating,
		objective: entry.data.objective,
		outlier: entry.data.outlier,
		safety: entry.data.safety,
	};
}

function getFeatureTitleProperties(
	entry: CollectionEntry<'locations'>,
	geometry: LocationGeometry,
	entryTitleMultilingual: MultilingualContent | undefined,
) {
	const geometryTitleMultilingual = getMultilingualContent({
		data: geometry,
		prop: 'title',
	})?.primary;

	return {
		title: geometry.title ? `${entry.data.title}: ${geometry.title}` : entry.data.title,
		...getMultilingualTitleProperties(entryTitleMultilingual, geometryTitleMultilingual),
	};
}

function getGeometryFeatureProperties(
	entry: CollectionEntry<'locations'>,
	geometry: LocationGeometry,
) {
	// Image thumbnails can be nulled by individual points
	const image = (geometry._imageThumbnail === undefined ? entry.data : geometry)._imageThumbnail;

	return {
		description: geometry.description ?? entry.data._descriptionHtml,
		category: geometry.category ?? entry.data.category,
		status: geometry.status ?? entry.data.status,
		precision: geometry.precision ?? entry.data.precision,
		googleMapsUrl: getShortenedUrl(
			geometry.googleMapsUrl ?? entry.data._googleMapsUrl,
			googleMapsHostPrefix,
		),
		...(image === null ? {} : { image }),
	};
}

function buildLocationFeatures(
	entry: CollectionEntry<'locations'>,
): Array<Feature<MapGeometry, MapFeatureProperties>> {
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
		type: 'Feature' as const,
		id: featureIds[index] ?? entry.id,
		properties: {
			...entryProperties,
			...getFeatureTitleProperties(entry, geometry, entryTitleMultilingual),
			...getGeometryFeatureProperties(entry, geometry),
		},
		geometry: {
			type: GeometryTypeEnum.Point,
			coordinates: geometry.coordinates,
		},
	}));

	locationFeaturesCache.set(entry, features);

	return features;
}

export function getLocationsFeatureCollection(
	locations: Array<CollectionEntry<'locations'>> | undefined,
	options?: LocationsFeatureCollectionOptions,
): FeatureCollection<MapGeometry, MapFeatureProperties> | undefined {
	if (!locations || locations.length === 0) return;

	const hideSensitiveLocations =
		options?.hideSensitiveLocations ?? contentPolicy.hideSensitiveLocations;

	const locationsFiltered = hideSensitiveLocations
		? locations.filter((entry) => !entry.data.hideLocation)
		: locations;

	return featureCollection<MapGeometry, MapFeatureProperties>(
		locationsFiltered.flatMap((entry) => buildLocationFeatures(entry)),
	) satisfies MapFeatureCollection;
}

// Encoded to the compressed form at serialization edges
export function getLocationsMapSourceData(
	featureCollection: MapFeatureCollection | undefined,
): Array<MapSourceItem> | undefined {
	if (!featureCollection || featureCollection.features.length === 0) return;

	return featureCollection.features
		.map((feature, index) => {
			const featureId = typeof feature.id === 'string' ? feature.id : `feature-${String(index)}`;
			const title = feature.properties.titleMultilingualValue
				? `${feature.properties.title} (${feature.properties.titleMultilingualValue})`
				: feature.properties.title;

			return {
				properties: {
					id: featureId,
					title: stripDiacritics(title),
					category: feature.properties.category,
					status: feature.properties.status,
					precision: feature.properties.precision,
					entryQuality: feature.properties.entryQuality,
					rating: feature.properties.rating,
					...(feature.properties.objective === undefined
						? {}
						: { objective: feature.properties.objective }),
					...(feature.properties.outlier === undefined
						? {}
						: { outlier: feature.properties.outlier }),
					hasImage: feature.properties.image !== undefined,
				},
				geometry: getMapGeometryOptimized(feature.geometry, featureId)!,
			} satisfies MapSourceItem;
		})
		.sort((a, b) => a.properties.id.localeCompare(b.properties.id));
}

export function getLocationsMapPopupData(
	featureCollection: MapFeatureCollection | undefined,
): Array<MapPopupItem> | undefined {
	if (!featureCollection || featureCollection.features.length === 0) return;

	return featureCollection.features
		.map((feature, index) => {
			const featureId = typeof feature.id === 'string' ? feature.id : `feature-${String(index)}`;

			return {
				id: featureId,
				title: stripDiacritics(feature.properties.title),
				titleMultilingualLang: feature.properties.titleMultilingualLang,
				titleMultilingualValue: feature.properties.titleMultilingualValue,
				url: feature.properties.url,
				description: feature.properties.description,
				safety: feature.properties.safety,
				googleMapsUrl: feature.properties.googleMapsUrl,
				wikipediaUrl: feature.properties.wikipediaUrl,
				...(feature.properties.image === undefined
					? {}
					: { image: { srcSet: feature.properties.image.srcSet } }),
			} satisfies MapPopupItem;
		})
		.sort((a, b) => a.id.localeCompare(b.id));
}

// Endpoint URLs and inline cache keys derive from these hashes
export function hashMapSourceData(sourceData: Array<MapSourceItem> | undefined) {
	return hash(sourceData).slice(0, hashShortLength);
}

export function hashMapPopupData(popupData: Array<MapPopupItem> | undefined) {
	return hash(popupData).slice(0, hashShortLength);
}
