import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import pLimit from 'p-limit';
import * as R from 'remeda';

import { OPEN_GRAPH_BASE_PATH, OPEN_GRAPH_IMAGE_FORMAT } from '#constants.ts';
import { getImageByIdFunction } from '#lib/collections/images/utils.ts';
import { getRegionsCollection } from '#lib/collections/regions/data.ts';
import { getSeriesCollection } from '#lib/collections/series/data.ts';
import { getThemesCollection } from '#lib/collections/themes/data.ts';
import { getImageObject } from '#lib/image/image-file-handling.ts';
import { getOpenGraphImage } from '#lib/image/image-open-graph.ts';
import { getImageSetPrimaryImage } from '#lib/image/image-set.ts';

export const getStaticPaths = (async () => {
	const { regions } = await getRegionsCollection();
	const { series } = await getSeriesCollection();
	const { themes } = await getThemesCollection();

	const getImageById = await getImageByIdFunction();

	const limit = pLimit(40);

	return await Promise.all(
		R.pipe(
			[...regions, ...series, ...themes] as const,
			R.filter(({ data }) => !!data.imageSet),
			R.map((entry) =>
				limit(async () => {
					const featuredImage = getImageSetPrimaryImage({
						imageSet: entry.data.imageSet,
					})!;
					const imageEntry = getImageById(featuredImage.id);
					const imageObject = imageEntry ? await getImageObject(imageEntry.data.src) : undefined;

					return {
						params: {
							opengraph: OPEN_GRAPH_BASE_PATH,
							collection: entry.collection,
							id: entry.id,
							ext: OPEN_GRAPH_IMAGE_FORMAT,
						},
						props: {
							imageOpenGraph: imageObject
								? await getOpenGraphImage({
										imageObject,
										format: OPEN_GRAPH_IMAGE_FORMAT,
										formatOptions: { quality: 85 },
									})
								: undefined,
						},
					};
				}),
			),
		),
	);
}) satisfies GetStaticPaths;

export const GET = (({ props: { imageOpenGraph } }) => {
	if (!imageOpenGraph) return new Response(undefined, { status: 404 });

	return new Response(imageOpenGraph.data, {
		status: 200,
		headers: {
			'Content-Type': `image/${imageOpenGraph.info.format === 'jpg' ? 'jpeg' : imageOpenGraph.info.format}`,
		},
	});
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
