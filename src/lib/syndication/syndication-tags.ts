import * as R from 'remeda';

interface TitledEntry {
	data: { title: string };
}

export function getSyndicationTags({
	getRegionAncestorsById,
	regionIds,
	themes,
}: {
	getRegionAncestorsById: (regionId: string) => Array<TitledEntry>;
	regionIds: Array<string>;
	themes: Array<TitledEntry>;
}) {
	return R.unique([
		...themes.map((theme) => theme.data.title),
		...regionIds.flatMap((regionId) =>
			getRegionAncestorsById(regionId).map((region) => region.data.title),
		),
	]);
}
