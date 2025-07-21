import type { MultiPolygon, Polygon } from 'geojson';

export interface RegionMetadata {
	slug: string;
	divisionIds: Array<string>;
	regionAncestorId: string;
}

export interface DivisionItem {
	divisionId: string;
	geometry: Polygon | MultiPolygon;
}
