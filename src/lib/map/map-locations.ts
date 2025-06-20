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
		features: locationsFiltered.flatMap((entry) => {
			const geometryArray = Array.isArray(entry.data.geometry)
				? entry.data.geometry
				: [entry.data.geometry];

			return geometryArray.map((geometry, index) => {
				const uuid = entry.data.uuid ?? entry.id;
				const id = geometryArray.length > 1 ? `${uuid}-${String(index)}` : uuid;
				const title = geometry.title ? `${entry.data.title} - ${geometry.title}` : entry.data.title;
				const titleAlt =
					entry.data.titleAlt && geometry.titleAlt
						? `${entry.data.titleAlt}．${geometry.titleAlt}`
						: entry.data.titleAlt;

				return {
					type: 'Feature' as const,
					id,
					properties: {
						title,
						titleAlt,
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
						googleMapsUrl: geometry.googleMapsUrl ?? entry.data.googleMapsUrl,
						wikipediaUrl: entry.data.wikipediaUrl,
						image: entry.data.imageThumbnail,
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

	return featureCollection.features.map((feature, index) => {
		const featureIdFallback = `feature-${String(index)}`;

		return {
			[MapDataKeysCompressed.Id]: typeof feature.id === 'string' ? feature.id : featureIdFallback,
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
			[MapDataKeysCompressed.Geometry]: getMapGeometryOptimized(feature.geometry)!,
		};
	}) satisfies MapSourceDataRaw;
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
