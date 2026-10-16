export {
	encodeMapPopupData,
	encodeMapSourceData,
	MapPopupItemSchema,
	mapPopupKeys,
	MapSourceItemSchema,
	mapSourceKeys,
	pickMapPopupProperties,
	pickMapSourceProperties,
} from '#codec.ts';
export type {
	MapFeatureProperties,
	MapPopupItem,
	MapPopupItemCompressed,
	MapSourceItem,
	MapSourceItemCompressed,
} from '#codec.ts';
export { MapPopupOwnField } from '#map-codes.ts';
export { MapDivisionMaskSchema } from '#map-division.ts';
export type { MapDivisionMask } from '#map-division.ts';
export { createRuleTest, getMapRowById, selectMapRows } from '#map-rules.ts';
export type { MapFeaturesRule, MapInterval } from '#map-rules.ts';
export { MapScopeRowSchema } from '#map-scopes.ts';
export type { MapScopeRow } from '#map-scopes.ts';
export { MapViewSchema } from '#map-view.ts';
export type { MapScope, MapView } from '#map-view.ts';
