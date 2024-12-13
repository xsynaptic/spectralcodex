import pLimit from 'p-limit';
import * as R from 'remeda';

import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { OPEN_GRAPH_BASE_PATH, OPEN_GRAPH_IMAGE_FORMAT } from '@/constants';
import { getEphemeraCollection } from '@/lib/collections/ephemera/data';
import { getImageByIdFunction } from '@/lib/collections/images/utils';
import { getLocationsCollection } from '@/lib/collections/locations/data';
import { getPagesCollection } from '@/lib/collections/pages/data';
import { getPostsCollection } from '@/lib/collections/posts/data';
import { getImageObject } from '@/lib/image/image-file-handling';
import { getOpenGraphImage } from '@/lib/image/image-open-graph';

export const getStaticPaths = (async () => {
	const { ephemera } = await getEphemeraCollection();
	const { locations } = await getLocationsCollection();
	const { pages } = await getPagesCollection();
	const { posts } = await getPostsCollection();

	const getImageById = await getImageByIdFunction();

	const limit = pLimit(40);

	return await Promise.all(
		R.pipe(
			[...ephemera, ...locations, ...pages, ...posts] as const,
			R.filter(({ data }) => !!data.imageFeatured),
			R.map((entry) =>
				limit(async () => {
					const image = getImageById(entry.data.imageFeatured!.id);
					const imageObject = await getImageObject(image.data.src.src);

					return {
						params: {
							opengraph: OPEN_GRAPH_BASE_PATH,
							id: entry.id,
							ext: OPEN_GRAPH_IMAGE_FORMAT,
						},
						props: {
							imageOpenGraph: await getOpenGraphImage({
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
