import type {
	MapGeometry,
	MapPopupDataRaw,
	MapSourceDataRaw,
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

import type { MapFeatureCollection } from '#lib/map/map-types.ts';

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
		case GeometryTypeEnum.MultiPoint:
		case GeometryTypeEnum.LineString: {
			return {
				[MapDataKeysCompressed.GeometryType]: MapDataGeometryTypeNumericMapping[geometryType],
				[MapDataKeysCompressed.GeometryCoordinates]: geometry.coordinates.map(
					getMapGeometryCoordinatesOptimized,
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
		features: locationsFiltered.map((entry) => ({
			type: 'Feature' as const,
			id: entry.data.uuid ?? entry.id,
			properties: {
				title: entry.data.title,
				titleAlt: entry.data.titleAlt,
				url: entry.data.url,
				description: entry.data.descriptionHtml,
				category: entry.data.category,
				status: entry.data.status,
				precision: entry.data.precision,
				quality: entry.data.entryQuality,
				rating: entry.data.rating,
				objective: entry.data.objective,
				outlier: entry.data.outlier,
				safety: entry.data.safety,
				googleMapsUrl: entry.data.googleMapsUrl,
				wikipediaUrl: entry.data.wikipediaUrl,
				image: entry.data.imageThumbnail,
				geometryMetadata: entry.data.geometryMetadata,
			},
			geometry: entry.data.geometry,
		})),
	} satisfies MapFeatureCollection;
}

// Optimized geodata for the map component; it will be reassembled into GeoJSON on the client
export function getLocationsMapSourceData(featureCollection: MapFeatureCollection | undefined) {
	if (!featureCollection || featureCollection.features.length === 0) return;

	// TODO: MultiPoint handling

	return featureCollection.features.map((feature, index) => ({
		[MapDataKeysCompressed.Id]:
			typeof feature.id === 'string' ? feature.id : `feature-${String(index)}`,
		[MapDataKeysCompressed.Category]: LocationCategoryNumericMapping[feature.properties.category],
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
		...(feature.properties.geometryMetadata === undefined
			? {}
			: { [MapDataKeysCompressed.GeometryMetadata]: feature.properties.geometryMetadata }),
		[MapDataKeysCompressed.Geometry]: getMapGeometryOptimized(feature.geometry)!,
	})) satisfies MapSourceDataRaw;
}

// Extended locations metadata for popups
export function getLocationsMapPopupData(featureCollection: MapFeatureCollection | undefined) {
	if (!featureCollection || featureCollection.features.length === 0) return;

	return featureCollection.features.map((feature, index) => ({
		[MapDataKeysCompressed.Id]:
			typeof feature.id === 'string' ? feature.id : `feature-${String(index)}`,
		[MapDataKeysCompressed.Title]: feature.properties.title,
		[MapDataKeysCompressed.TitleAlt]: feature.properties.titleAlt,
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
	})) satisfies MapPopupDataRaw;
}

// A specialized function for returning data for API endpoints
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
