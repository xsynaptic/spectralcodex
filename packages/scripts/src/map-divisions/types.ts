import type { GeometryBoundingBox } from '@spectralcodex/shared/map';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export interface RegionMetadata {
	divisionClippingBBox?: GeometryBoundingBox;
	divisionIds: Array<string>;
	divisionSelectionBBox?: GeometryBoundingBox;
	id: string;
	regionPathIds: Array<string>;
}

export type DivisionGeometry = MultiPolygon | Polygon;

export type DivisionFeatureCollection = FeatureCollection<DivisionGeometry>;

export interface DivisionItem {
	divisionId: string;
	geometry: DivisionGeometry;
}
