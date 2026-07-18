import type { MapPopupItem, MapSourceItem } from '@spectralcodex/map-codec';
import type { MapGeometry } from '@spectralcodex/react-map-component';
import type { CollectionEntry } from 'astro:content';
import type { FeatureCollection, Position } from 'geojson';

import { hashShort } from '@spectralcodex/shared/cache';
import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { stripDiacritics } from '@spectralcodex/shared/text';
import { featureCollection } from '@turf/helpers';

import type { MapFeatureCollection, MapFeatureProperties } from '#lib/map/map-types.ts';

import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';

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

// An alternative to using Turf's truncate function
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

interface LocationsFeatureCollectionOptions {
	showAllLocations?: boolean | undefined;
}

// Canonical feature ids for a location; multi-geometry locations expand to one `uuid-N` per sub-geometry
export function getLocationFeatureIds(entry: CollectionEntry<'locations'>): Array<string> {
	const uuid = entry.data._uuid ?? entry.id;
	const geometryArray = Array.isArray(entry.data.geometry)
		? entry.data.geometry
		: [entry.data.geometry];

	return geometryArray.length > 1
		? [...geometryArray.keys()].map((index) => `${uuid}-${String(index)}`)
		: [uuid];
}

// Generate canonical map feature data for a set of locations
export function getLocationsFeatureCollection(
	locations: Array<CollectionEntry<'locations'>> | undefined,
	options?: LocationsFeatureCollectionOptions,
): FeatureCollection<MapGeometry, MapFeatureProperties> | undefined {
	if (!locations || locations.length === 0) return;

	const { showAllLocations } = Object.assign(
		{
			showAllLocations: false,
		},
		options ?? {},
	);

	const locationsFiltered =
		showAllLocations || import.meta.env.DEV
			? locations
			: locations.filter((entry) => !entry.data.hideLocation);

	return featureCollection<MapGeometry, MapFeatureProperties>(
		locationsFiltered.flatMap((entry) => {
			const geometryArray = Array.isArray(entry.data.geometry)
				? entry.data.geometry
				: [entry.data.geometry];
			const featureIds = getLocationFeatureIds(entry);
			const entryTitleMultilingual = getMultilingualContent({
				data: entry.data,
				prop: 'title',
			})?.primary;

			return geometryArray.map((geometry, index) => {
				const id = featureIds[index] ?? entry.id;
				const title = geometry.title ? `${entry.data.title}: ${geometry.title}` : entry.data.title;
				const geometryTitleMultilingual = getMultilingualContent({
					data: geometry,
					prop: 'title',
				})?.primary;
				const googleMapsUrlRaw =
					geometry.googleMapsUrl || entry.data._googleMapsUrl
						? (geometry.googleMapsUrl ?? entry.data._googleMapsUrl ?? '').replace('https://', '')
						: undefined;
				const googleMapsUrl = googleMapsUrlRaw?.startsWith('maps.app.goo.gl/')
					? googleMapsUrlRaw.slice('maps.app.goo.gl/'.length)
					: googleMapsUrlRaw;
				const wikipediaUrl = entry.data._wikipediaUrl
					? entry.data._wikipediaUrl.replace('https://', '')
					: undefined;

				// Image thumbnails can be nulled by sub-locations
				const image = (geometry._imageThumbnail === undefined ? entry.data : geometry)
					._imageThumbnail;

				return {
					type: 'Feature' as const,
					id,
					properties: {
						title,
						...(entryTitleMultilingual
							? {
									titleMultilingualLang: entryTitleMultilingual.lang,
									titleMultilingualValue: geometryTitleMultilingual
										? `${entryTitleMultilingual.value}：${geometryTitleMultilingual.value}`
										: entryTitleMultilingual.value,
								}
							: {}),
						url: getRelativePath(entry.data._url),
						description: geometry.description ?? entry.data._descriptionHtml,
						category: geometry.category ?? entry.data.category,
						status: geometry.status ?? entry.data.status,
						precision: geometry.precision ?? entry.data.precision,
						quality: entry.data.entryQuality,
						rating: entry.data.rating,
						objective: entry.data.objective,
						outlier: entry.data.outlier,
						safety: entry.data.safety,
						googleMapsUrl,
						wikipediaUrl,
						...(image === null ? {} : { image }),
					},
					geometry: {
						type: GeometryTypeEnum.Point,
						coordinates: geometry.coordinates,
					},
				};
			});
		}),
	) satisfies MapFeatureCollection;
}

// Source data for the map component; encoded to the compressed form at serialization edges
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
					quality: feature.properties.quality,
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

// Extended locations metadata for popups
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

// Endpoint URLs and inline cache keys derive from these hashes; the { data } wrapper is part of the key
export function hashMapSourceData(sourceData: Array<MapSourceItem> | undefined) {
	return hashShort({ data: sourceData });
}

export function hashMapPopupData(popupData: Array<MapPopupItem> | undefined) {
	return hashShort({ data: popupData });
}
