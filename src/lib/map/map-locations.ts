import type {
	MapGeometry,
	MapPopupItemInput,
	MapSourceItemInput,
} from '@spectralcodex/react-map-component';
import type { CollectionEntry } from 'astro:content';
import type { FeatureCollection, Position } from 'geojson';

import {
	GeometryTypeEnum,
	LocationCategoryNumericMapping,
	LocationStatusNumericMapping,
	MapDataGeometryTypeNumericMapping,
	MapDataKeysCompressed,
} from '@spectralcodex/shared/map';
import { featureCollection } from '@turf/helpers';
import { hashShort } from 'packages/shared/src/cache';

import type { MapFeatureCollection, MapFeatureProperties } from '#lib/map/map-types.ts';

import { getPrimaryMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { MapApiDataEnum } from '#lib/map/map-types.ts';

function getMapGeometryCoordinatesOptimized(coordinates: Position): [number, number] {
	const truncatedCoordinates = coordinates
		.slice(0, 2)
		.map((value) => Number.parseFloat(value.toFixed(6)));

	return [truncatedCoordinates[0] ?? 0, truncatedCoordinates[1] ?? 0];
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
			const entryTitleMultilingual = getPrimaryMultilingualContent(entry.data, 'title');

			return geometryArray.map((geometry, index) => {
				const uuid = entry.data._uuid ?? entry.id;
				const id = geometryArray.length > 1 ? `${uuid}-${String(index)}` : uuid;
				const title = geometry.title ? `${entry.data.title} - ${geometry.title}` : entry.data.title;
				const geometryTitleMultilingual = getPrimaryMultilingualContent(geometry, 'title');
				const googleMapsUrl =
					geometry.googleMapsUrl || entry.data._googleMapsUrl
						? (geometry.googleMapsUrl ?? entry.data._googleMapsUrl ?? '').replace('https://', '')
						: undefined;
				const wikipediaUrl = entry.data._wikipediaUrl
					? entry.data._wikipediaUrl.replace('https://', '')
					: undefined;

				// Image thumbnails can be nulled by sub-locations
				const image =
					geometry._imageThumbnail === undefined
						? entry.data._imageThumbnail
						: geometry._imageThumbnail;

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
						url: entry.data._url,
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

// Optimized geodata for the map component; it will be reassembled into GeoJSON on the client
export function getLocationsMapSourceData(
	featureCollection: MapFeatureCollection | undefined,
): Array<MapSourceItemInput> | undefined {
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
		.sort((a, b) => a[MapDataKeysCompressed.Id].localeCompare(b[MapDataKeysCompressed.Id]));
}

// Extended locations metadata for popups
export function getLocationsMapPopupData(
	featureCollection: MapFeatureCollection | undefined,
): Array<MapPopupItemInput> | undefined {
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
		.sort((a, b) => a[MapDataKeysCompressed.Id].localeCompare(b[MapDataKeysCompressed.Id]));
}

// Hash the contents of each API endpoint
export function getLocationsMapApiHashes(featureCollection: MapFeatureCollection | undefined) {
	const sourceData = getLocationsMapSourceData(featureCollection);
	const popupData = getLocationsMapPopupData(featureCollection);

	return {
		sourceHash: hashShort({ data: sourceData }),
		popupHash: hashShort({ data: popupData }),
	};
}

export function getLocationsMapApiData(
	locations: Array<CollectionEntry<'locations'>> | undefined,
	basePath: string,
	options?: LocationsFeatureCollectionOptions,
):
	| Array<{
			params: { id: string };
			props: { data: Array<MapSourceItemInput> | Array<MapPopupItemInput> };
	  }>
	| undefined {
	const featureCollection = getLocationsFeatureCollection(locations, options);
	const sourceData = getLocationsMapSourceData(featureCollection);
	const popupData = getLocationsMapPopupData(featureCollection);

	if (!sourceData || !popupData) return;

	return [MapApiDataEnum.Source, MapApiDataEnum.Popup].map((key) => ({
		params: {
			id: `${basePath}/${key}`,
		},
		props: { data: key === MapApiDataEnum.Source ? sourceData : popupData },
	}));
}
