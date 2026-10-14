import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationStatusEnum,
} from '@spectralcodex/shared/map';

export const MapDataKeys = {
	Category: 'category',
	ChunkKey: 'chunkKey',
	Description: 'description',
	Geometry: 'geometry',
	GeometryCoordinates: 'coordinates',
	GeometryType: 'type',
	GoogleMapsUrl: 'googleMapsUrl',
	HasImage: 'hasImage',
	Id: 'id',
	Image: 'image',
	ImageSrcSet: 'srcSet',
	Objective: 'objective',
	Outlier: 'outlier',
	Own: 'own',
	PointTitle: 'pointTitle',
	Precision: 'precision',
	Rating: 'rating',
	RegionOrdinals: 'regionOrdinals',
	Status: 'status',
	ThemeIndices: 'themeIndices',
	Title: 'title',
	TitleMultilingualLang: 'titleMultilingualLang',
	TitleMultilingualValue: 'titleMultilingualValue',
	Url: 'url',
	WikipediaUrl: 'wikipediaUrl',
} as const;

export const MapDataKeysCompressed = {
	Category: 'c',
	ChunkKey: 'k',
	Description: 'd',
	Geometry: 'g',
	GeometryCoordinates: 'x',
	GeometryType: 'j',
	GoogleMapsUrl: 'm',
	HasImage: 'n',
	Id: 'i',
	Image: 'e',
	ImageSrcSet: 'y',
	Objective: 'o',
	Outlier: 'l',
	Own: 'z',
	PointTitle: 'q',
	Precision: 'p',
	Rating: 'r',
	RegionOrdinals: 'b',
	Status: 's',
	ThemeIndices: 'h',
	Title: 't',
	TitleMultilingualLang: 'a',
	TitleMultilingualValue: 'v',
	Url: 'u',
	WikipediaUrl: 'w',
} as const satisfies Record<keyof typeof MapDataKeys, string>;

// Flags for the fields a Point sets itself rather than inheriting from its Location
export const MapPopupOwnField = {
	Description: 1,
	Image: 2,
	Precision: 8,
	Wikipedia: 4,
} as const;

export const MapDataGeometryTypeNumericMapping = {
	[GeometryTypeEnum.LineString]: 2,
	[GeometryTypeEnum.MultiPoint]: 1,
	[GeometryTypeEnum.MultiPolygon]: 4,
	[GeometryTypeEnum.Point]: 0,
	[GeometryTypeEnum.Polygon]: 3,
} as const;

export const LocationCategoryNumericMapping = Object.fromEntries(
	Object.values(LocationCategoryEnum).map((value, i) => [value, i]),
) as Record<(typeof LocationCategoryEnum)[keyof typeof LocationCategoryEnum], number>;

export const LocationStatusNumericMapping = Object.fromEntries(
	Object.values(LocationStatusEnum).map((value, i) => [value, i]),
) as Record<(typeof LocationStatusEnum)[keyof typeof LocationStatusEnum], number>;

// Payload hashes cover the uncompressed items; fold these in so a renumbered code changes the immutable URL
export const mapCodecTables = [
	MapDataKeysCompressed,
	MapDataGeometryTypeNumericMapping,
	LocationCategoryNumericMapping,
	LocationStatusNumericMapping,
] as const;
