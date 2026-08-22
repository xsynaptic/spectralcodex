import * as R from 'remeda';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { getImagesCollection } from '#lib/collections/images/images-data.ts';
import { formatNumber } from '#lib/utils/text.ts';

function getCatalogCounts(data: Array<CatalogItem> | undefined) {
	return {
		itemCount: formatNumber({ number: data?.length ?? 0 }),
		wordCount: formatNumber({
			number: data?.reduce((previous, { wordCount }) => previous + (wordCount ?? 0), 0) ?? 0,
		}),
	};
}

export async function getCatalogStats() {
	const catalog = await getCatalog();

	const catalogItems = [...catalog.all()];

	const catalogGroups = R.groupBy(catalogItems, (item) => item.collection);

	const { entries: images } = await getImagesCollection();

	const stats = {
		locations: {
			...getCatalogCounts(catalogGroups.locations),
			withImages: formatNumber({
				number: catalogGroups.locations?.filter((item) => item.imageId).length ?? 0,
			}),
		},
		pages: getCatalogCounts(catalogGroups.pages),
		posts: getCatalogCounts(catalogGroups.posts),
		regions: getCatalogCounts(catalogGroups.regions),
		series: getCatalogCounts(catalogGroups.series),
		themes: getCatalogCounts(catalogGroups.themes),
		images: {
			itemCount: formatNumber({ number: images.length }),
		},
		linksExternal: {
			itemCount: formatNumber({
				number: catalogItems.reduce(
					(linksExternalCountPrevious, { linksExternalCount }) =>
						linksExternalCountPrevious + (linksExternalCount ?? 0),
					0,
				),
			}),
		},
	};

	return {
		...stats,
		total: {
			...getCatalogCounts(catalogItems),
		},
	};
}
