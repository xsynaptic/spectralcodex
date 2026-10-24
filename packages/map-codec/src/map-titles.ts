import type { MapSourceItem } from '#schemas/codec.ts';

const fullWidthScriptPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

export function joinMapTitles(locationTitle: string, pointTitle: string | undefined) {
	if (pointTitle === undefined) return locationTitle;

	const separator = fullWidthScriptPattern.test(locationTitle) ? '：' : ': ';

	return `${locationTitle}${separator}${pointTitle}`;
}

export function getMapRowLabel({
	pointTitle,
	pointTitleMultilingual,
	title,
	titleMultilingual,
}: MapSourceItem['properties']) {
	const label = joinMapTitles(title, pointTitle);

	if (titleMultilingual === undefined) return label;

	return `${label} (${joinMapTitles(titleMultilingual, pointTitleMultilingual)})`;
}
