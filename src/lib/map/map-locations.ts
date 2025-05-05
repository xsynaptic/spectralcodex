import type {
	MapGeometry,
	MapPopupDataRaw,
	MapSourceDataRaw,
} from '@spectralcodex/react-map-component';
import type { CollectionEntry } from 'astro:content';

import {
	MapGeometryTypeMap,
	MapLocationCategoryMap,
	MapLocationStatusMap,
} from '@spectralcodex/react-map-component';

import type { MapFeatureCollection } from '#lib/map/map-types.ts';

import { MapApiDataEnum } from '#lib/map/map-types.ts';

// An alternative to using Turf's truncate function
function getMapGeometryOptimized(geometry: MapGeometry) {
	switch (geometry.type) {
		case 'Point': {
			return {
				t: MapGeometryTypeMap[geometry.type],
				x: geometry.coordinates.slice(0, 2).map((value) => Number.parseFloat(value.toFixed(6))) as [
					number,
					number,
				],
			};
		}
		default: {
			return {
				t: MapGeometryTypeMap[geometry.type],
				x: geometry.coordinates.map((position) =>
					position.slice(0, 2).map((value) => Number.parseFloat(value.toFixed(6))),
				) as Array<[number, number]>,
			};
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
			},
			geometry: entry.data.geometry,
		})),
	} satisfies MapFeatureCollection;
}

// Optimized geodata for the map component; it will be reassembled into GeoJSON on the client
export function getLocationsMapSourceData(featureCollection: MapFeatureCollection | undefined) {
	if (!featureCollection || featureCollection.features.length === 0) return;

	return featureCollection.features.map((feature, index) => ({
		i: typeof feature.id === 'string' ? feature.id : `feature-${String(index)}`,
		c: MapLocationCategoryMap[feature.properties.category],
		s: MapLocationStatusMap[feature.properties.status],
		p: feature.properties.precision,
		q: feature.properties.quality,
		r: feature.properties.rating,
		...(feature.properties.objective === undefined ? {} : { o: feature.properties.objective }),
		...(feature.properties.outlier === undefined ? {} : { l: feature.properties.outlier }),
		g: getMapGeometryOptimized(feature.geometry),
	})) satisfies MapSourceDataRaw;
}

// Extended locations metadata for popups
export function getLocationsMapPopupData(featureCollection: MapFeatureCollection | undefined) {
	if (!featureCollection || featureCollection.features.length === 0) return;

	return featureCollection.features.map((feature, index) => ({
		i: typeof feature.id === 'string' ? feature.id : `feature-${String(index)}`,
		t: feature.properties.title,
		a: feature.properties.titleAlt,
		u: feature.properties.url,
		d: feature.properties.description,
		s: feature.properties.safety,
		g: feature.properties.googleMapsUrl,
		w: feature.properties.wikipediaUrl,
		m: feature.properties.image, // TODO: compress `srcSet` field; this can still be optimized
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
