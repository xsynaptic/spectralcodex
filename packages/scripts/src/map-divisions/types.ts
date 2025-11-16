import type { GeometryBoundingBox } from '@spectralcodex/map-types';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export interface RegionMetadata {
	slug: string;
	divisionIds: Array<string>;
	regionPathIds: Array<string>;
	divisionSelectionBBox?: GeometryBoundingBox;
	divisionClippingBBox?: GeometryBoundingBox;
}

export type DivisionGeometry = Polygon | MultiPolygon;

export type DivisionFeatureCollection = FeatureCollection<DivisionGeometry>;

export interface DivisionItem {
	divisionId: string;
	geometry: DivisionGeometry;
}
