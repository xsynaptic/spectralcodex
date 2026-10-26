import { LocationStatusEnum } from '@spectralcodex/shared/map';

import { coded, field, getFieldKeys, keysOf, plain, withFallback } from '#codec-fields.ts';
import { LocationStatusNumericMapping } from '#map-codes.ts';

export const sourceFields = {
	backlinks: plain('c'),
	chunkKey: plain('k'),
	entryQuality: withFallback('f', 1),
	hasImage: withFallback('n', false),
	id: plain('i'),
	objective: plain('o'),
	outlier: plain('l'),
	pointTitle: plain('q'),
	pointTitleMultilingual: plain('m'),
	precision: plain('p'),
	rating: plain('r'),
	regionOrdinals: plain('b'),
	status: coded('s', LocationStatusNumericMapping, LocationStatusEnum.Unknown),
	themeIndices: plain('h'),
	title: plain('t'),
	titleMultilingual: plain('v'),
};

const googleMapsHost = 'https://maps.app.goo.gl/';

function shortenUrl(url: string | undefined, host?: string) {
	if (!url) return;
	if (host && url.startsWith(host)) return url.slice(host.length);

	return url.replace('https://', '');
}

function expandUrl(value: string | undefined, host?: string) {
	if (!value) return;
	if (value.includes('://')) return value;
	if (host && !value.includes('/')) return `${host}${value}`;

	return `https://${value}`;
}

function url<Key extends string>(key: Key, host?: string) {
	return field(key, {
		decode: (value: string | undefined) => expandUrl(value, host),
		encode: (value: string | undefined) => shortenUrl(value, host),
	});
}

export const popupFields = {
	description: plain('d'),
	googleMapsUrl: url('m', googleMapsHost),
	id: plain('i'),
	own: plain('z'),
	ownTitle: plain('o'),
	ownTitleMultilingualLang: plain('b'),
	ownTitleMultilingualValue: plain('u'),
	popupImageSources: field('y', {
		decode: (sources: Array<[string, number]> | undefined) =>
			sources?.map(([path, width]) => ({ path, width })),
		encode: (sources: Array<{ path: string; width: number }> | undefined) =>
			sources?.map(({ path, width }): [string, number] => [path, width]),
	}),
	title: plain('t'),
	titleMultilingualLang: plain('a'),
	titleMultilingualValue: plain('v'),
	wikipediaUrl: url('w'),
};

export const geometryKey = 'g';

export const mapSourceKeys = { ...getFieldKeys(sourceFields), geometry: geometryKey } as const;
export const mapPopupKeys = getFieldKeys(popupFields);

function pickByNames<Names extends string>(names: ReadonlyArray<Names>) {
	return function pick<Properties extends object>(properties: Properties) {
		const picked: Record<string, unknown> = {};

		for (const name of names) {
			const value = (properties as Record<string, unknown>)[name];

			if (value !== undefined) picked[name] = value;
		}

		return picked as Pick<Properties, Extract<keyof Properties, Names>>;
	};
}

export const pickMapSourceProperties = pickByNames([...keysOf(sourceFields), 'url'] as const);
export const pickMapPopupProperties = pickByNames(keysOf(popupFields));
