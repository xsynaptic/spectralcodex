import type { MapFeaturesRule } from '#map-rules.ts';

type MapPosition = [number, number];

export interface MapScope {
	apiDivisionUrl?: string;
	bounds?: [MapPosition, MapPosition] | [number, number, number, number];
	rule: MapFeaturesRule;
	title: string;
	url: string;
}

export interface MapView {
	scope?: MapScope;
	targetIds?: Array<string>;
}

type Guard = (value: unknown) => boolean;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown) {
	return typeof value === 'string';
}

function isStrings(value: unknown) {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNumbers(value: unknown, length: number) {
	return (
		Array.isArray(value) &&
		value.length === length &&
		value.every((item) => typeof item === 'number')
	);
}

function isOptional(record: Record<string, unknown>, key: string, isValid: Guard) {
	return !Object.hasOwn(record, key) || isValid(record[key]);
}

function isBounds(value: unknown) {
	if (isNumbers(value, 4)) return true;

	return (
		Array.isArray(value) && value.length === 2 && value.every((position) => isNumbers(position, 2))
	);
}

const ruleGuards = {
	ids: (rule) => isStrings(rule.ids),
	region: (rule) => isNumbers(rule.interval, 2),
	theme: (rule) => typeof rule.index === 'number',
} satisfies Record<MapFeaturesRule['type'], (rule: Record<string, unknown>) => boolean>;

function isRuleType(type: unknown): type is MapFeaturesRule['type'] {
	return typeof type === 'string' && Object.hasOwn(ruleGuards, type);
}

function isRule(value: unknown) {
	if (!isRecord(value) || !isRuleType(value.type)) return false;

	return ruleGuards[value.type](value);
}

function isScope(value: unknown) {
	if (!isRecord(value)) return false;

	return (
		isRule(value.rule) &&
		isString(value.title) &&
		isString(value.url) &&
		isOptional(value, 'apiDivisionUrl', isString) &&
		isOptional(value, 'bounds', isBounds)
	);
}

export function isMapView(value: unknown): value is MapView {
	if (!isRecord(value)) return false;

	return isOptional(value, 'scope', isScope) && isOptional(value, 'targetIds', isStrings);
}
