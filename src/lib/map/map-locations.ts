import type {
	MapGeometry,
	MapPopupItemInput,
	MapSourceItemInput,
} from '@spectralcodex/react-map-component';
import type { CollectionEntry } from 'astro:content';
import type { Position } from 'geojson';

import {
	GeometryTypeEnum,
	LocationCategoryNumericMapping,
	LocationStatusNumericMapping,
	MapDataGeometryTypeNumericMapping,
	MapDataKeysCompressed,
} from '@spectralcodex/map-types';
import { createHash } from 'node:crypto';

import type { MapFeatureCollection } from '#lib/map/map-types.ts';

import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { MapApiDataEnum } from '#lib/map/map-types.ts';

function getMapGeometryCoordinatesOptimized(coordinates: Position) {
	return coordinates.slice(0, 2).map((value) => Number.parseFloat(value.toFixed(6))) as [
		number,
		number,
	];
}

// An alternative to using Turf's truncate function
function getMapGeometryOptimized(geometry: MapGeometry) {
	const geometryType = geometry.type;

	switch (geometryType) {
		case GeometryTypeEnum.Point: {
			return {
				[MapDataKeysCompressed.GeometryType]: MapDataGeometryTypeNumericMapping[geometryType],
				[MapDataKeysCompressed.GeometryCoordinates]: getMapGeometryCoordinatesOptimized(
					geometry.coordinates,
				),
			};
		}
		case GeometryTypeEnum.LineString: {
			return {
				[MapDataKeysCompressed.GeometryType]: MapDataGeometryTypeNumericMapping[geometryType],
				[MapDataKeysCompressed.GeometryCoordinates]: geometry.coordinates.map(
					getMapGeometryCoordinatesOptimized,
				),
			};
		}
		case GeometryTypeEnum.Polygon: {
			return {
				[MapDataKeysCompressed.GeometryType]: MapDataGeometryTypeNumericMapping[geometryType],
				[MapDataKeysCompressed.GeometryCoordinates]: geometry.coordinates.map((ring) =>
					ring.map(getMapGeometryCoordinatesOptimized),
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

// Generate canonical map feature data for a set of locations
export function getLocationsFeatureCollection(
	locations: Array<CollectionEntry<'locations'>> | undefined,
	options?: LocationsFeatureCollectionOptions,
) {
	if (!locations || locations.length === 0) return;

	const { showAllLocations } = Object.assign(
		{
			showAllLocations: false,
		},
		options ?? {},
	);

	const locationsFiltered = showAllLocations
		? locations
		: locations.filter((entry) => entry.data.hideLocation !== true);

	return {
		type: 'FeatureCollection' as const,
		features: locationsFiltered.flatMap((entry) => {
			const geometryArray = Array.isArray(entry.data.geometry)
				? entry.data.geometry
				: [entry.data.geometry];
			const entryTitleMultilingual = getMultilingualContent(entry.data, 'title');

			return geometryArray.map((geometry, index) => {
				const uuid = entry.data.uuid ?? entry.id;
				const id = geometryArray.length > 1 ? `${uuid}-${String(index)}` : uuid;
				const title = geometry.title ? `${entry.data.title} - ${geometry.title}` : entry.data.title;
				const geometryTitleMultilingual = getMultilingualContent(geometry, 'title');
				const googleMapsUrl =
					geometry.googleMapsUrl || entry.data.googleMapsUrl
						? (geometry.googleMapsUrl ?? entry.data.googleMapsUrl ?? '').replace('https://', '')
						: undefined;
				const wikipediaUrl = entry.data.wikipediaUrl
					? entry.data.wikipediaUrl.replace('https://', '')
					: undefined;

				// Image thumbnails can be nulled by sub-locations
				const image =
					geometry.imageThumbnail === undefined
						? entry.data.imageThumbnail
						: geometry.imageThumbnail;

				return {
					type: 'Feature' as const,
					id,
					properties: {
						title,
						...(entryTitleMultilingual
							? {
									titleMultilingualLang: entryTitleMultilingual.lang,
									titleMultilingualValue: geometryTitleMultilingual
										? `${entryTitleMultilingual.value} - ${geometryTitleMultilingual.value}`
										: entryTitleMultilingual.value,
								}
							: {}),
						url: entry.data.url,
						description: geometry.description ?? entry.data.descriptionHtml,
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
	} satisfies MapFeatureCollection;
}

// Optimized geodata for the map component; it will be reassembled into GeoJSON on the client
export function getLocationsMapSourceData(featureCollection: MapFeatureCollection | undefined) {
	if (!featureCollection || featureCollection.features.length === 0) return;

	return featureCollection.features
		.map((feature, index) => {
			const featureId = typeof feature.id === 'string' ? feature.id : `feature-${String(index)}`;
			const title = feature.properties.titleMultilingualValue
				? `${feature.properties.title} (${feature.properties.titleMultilingualValue})`
				: feature.properties.title;

			return {
				[MapDataKeysCompressed.Id]: featureId,
				[MapDataKeysCompressed.Title]: title,
				[MapDataKeysCompressed.Category]:
					LocationCategoryNumericMapping[feature.properties.category],
				[MapDataKeysCompressed.Status]: LocationStatusNumericMapping[feature.properties.status],
				[MapDataKeysCompressed.Precision]: feature.properties.precision,
				[MapDataKeysCompressed.Quality]: feature.properties.quality,
				[MapDataKeysCompressed.Rating]: feature.properties.rating,
				...(feature.properties.objective === undefined
					? {}
					: { [MapDataKeysCompressed.Objective]: feature.properties.objective }),
				...(feature.properties.outlier === undefined
					? {}
					: { [MapDataKeysCompressed.Outlier]: feature.properties.outlier }),
				...(feature.properties.image === undefined
					? {}
					: { [MapDataKeysCompressed.HasImage]: true }),
				[MapDataKeysCompressed.Geometry]: getMapGeometryOptimized(feature.geometry)!,
			};
		})
		.sort((a, b) =>
			a[MapDataKeysCompressed.Id].localeCompare(b[MapDataKeysCompressed.Id]),
		) satisfies Array<MapSourceItemInput>;
}

// Extended locations metadata for popups
export function getLocationsMapPopupData(featureCollection: MapFeatureCollection | undefined) {
	if (!featureCollection || featureCollection.features.length === 0) return;

	return featureCollection.features
		.map((feature, index) => {
			const featureId = typeof feature.id === 'string' ? feature.id : `feature-${String(index)}`;

			return {
				[MapDataKeysCompressed.Id]: featureId,
				[MapDataKeysCompressed.Title]: feature.properties.title,
				[MapDataKeysCompressed.TitleMultilingualLang]: feature.properties.titleMultilingualLang,
				[MapDataKeysCompressed.TitleMultilingualValue]: feature.properties.titleMultilingualValue,
				[MapDataKeysCompressed.Url]: feature.properties.url,
				[MapDataKeysCompressed.Description]: feature.properties.description,
				[MapDataKeysCompressed.Safety]: feature.properties.safety,
				[MapDataKeysCompressed.GoogleMapsUrl]: feature.properties.googleMapsUrl,
				[MapDataKeysCompressed.WikipediaUrl]: feature.properties.wikipediaUrl,
				...(feature.properties.image === undefined
					? {}
					: {
							[MapDataKeysCompressed.ImageSrc]: feature.properties.image.src,
							[MapDataKeysCompressed.ImageSrcSet]: feature.properties.image.srcSet,
							[MapDataKeysCompressed.ImageHeight]: feature.properties.image.height,
							[MapDataKeysCompressed.ImageWidth]: feature.properties.image.width,
						}),
			};
		})
		.sort((a, b) =>
			a[MapDataKeysCompressed.Id].localeCompare(b[MapDataKeysCompressed.Id]),
		) satisfies Array<MapPopupItemInput>;
}

// Hash the contents of each API endpoint
export function getLocationsMapApiHashes(featureCollection: MapFeatureCollection | undefined) {
	const sourceData = getLocationsMapSourceData(featureCollection);
	const popupData = getLocationsMapPopupData(featureCollection);

	return {
		sourceHash: createHash('md5').update(JSON.stringify(sourceData)).digest('hex').slice(0, 8),
		popupHash: createHash('md5').update(JSON.stringify(popupData)).digest('hex').slice(0, 8),
	};
}

export function getLocationsMapApiData(
	locations: Array<CollectionEntry<'locations'>> | undefined,
	basePath: string,
	options?: LocationsFeatureCollectionOptions,
) {
	const featureCollection = getLocationsFeatureCollection(locations, options);
	const sourceData = getLocationsMapSourceData(featureCollection);
	const popupData = getLocationsMapPopupData(featureCollection);

	return [MapApiDataEnum.Source, MapApiDataEnum.Popup].map((key) => ({
		params: {
			id: `${basePath}/${key}`,
		},
		props: { data: key === MapApiDataEnum.Source ? sourceData : popupData },
	}));
}
