import type { GeometryBoundingBox } from '@spectralcodex/shared/map';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export type DivisionFeatureCollection = FeatureCollection<DivisionGeometry>;

export type DivisionGeometry = MultiPolygon | Polygon;

export interface DivisionItem {
	divisionId: string;
	geometry: DivisionGeometry;
}

export interface RegionMetadata {
	divisionClippingBBox?: GeometryBoundingBox;
	divisionIds: Array<string>;
	divisionSelectionBBox?: GeometryBoundingBox;
	id: string;
	regionPathIds: Array<string>;
}
