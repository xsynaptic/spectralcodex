import pLimit from 'p-limit';
import * as R from 'remeda';

import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { OPEN_GRAPH_BASE_PATH, OPEN_GRAPH_IMAGE_FORMAT } from '@/constants';
import { getImageByIdFunction } from '@/lib/collections/images/utils';
import { getRegionsCollection } from '@/lib/collections/regions/data';
import { getSeriesCollection } from '@/lib/collections/series/data';
import { getThemesCollection } from '@/lib/collections/themes/data';
import { getSingleFeaturedItem } from '@/lib/image/image-featured';
import { getImageObject } from '@/lib/image/image-file-handling';
import { getOpenGraphImageStandard } from '@/lib/open-graph/open-graph-image-utils';

export const getStaticPaths = (async () => {
	const { regions } = await getRegionsCollection();
	const { series } = await getSeriesCollection();
	const { themes } = await getThemesCollection();

	const getImageById = await getImageByIdFunction();

	const limit = pLimit(40);

	return await Promise.all(
		R.pipe(
			[...regions, ...series, ...themes] as const,
			R.filter(({ data }) => !!data.images),
			R.map((entry) =>
				limit(async () => {
					const featuredImage = getSingleFeaturedItem({
						images: entry.data.images,
					})!;
					const image = getImageById(featuredImage.src.id);
					const imageObject = await getImageObject(image.data.src.src);

					return {
						params: {
							opengraph: OPEN_GRAPH_BASE_PATH,
							collection: entry.collection,
							id: entry.id,
							ext: OPEN_GRAPH_IMAGE_FORMAT,
						},
						props: {
							imageOpenGraph: await getOpenGraphImageStandard({
								imageObject,
								format: OPEN_GRAPH_IMAGE_FORMAT,
								formatOptions: { quality: 85 },
							}),
						},
					};
				}),
			),
		),
	);
}) satisfies GetStaticPaths;

export const GET = (({
	props: {
		imageOpenGraph: { data, info },
	},
}) => {
	return new Response(data, {
		status: 200,
		headers: {
			'Content-Type': `image/${info.format === 'jpg' ? 'jpeg' : info.format}`,
		},
	});
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
