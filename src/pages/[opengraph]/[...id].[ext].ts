import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import pLimit from 'p-limit';
import * as R from 'remeda';

import { OPEN_GRAPH_BASE_PATH, OPEN_GRAPH_IMAGE_FORMAT } from '#constants.ts';
import { getEphemeraCollection } from '#lib/collections/ephemera/data.ts';
import { getLocationsCollection } from '#lib/collections/locations/data.ts';
import { getPagesCollection } from '#lib/collections/pages/data.ts';
import { getPostsCollection } from '#lib/collections/posts/data.ts';
import { getImageFeaturedId } from '#lib/image/image-featured.ts';
import {
	getOpenGraphImageFunction,
	getPreGeneratedOpenGraphImages,
} from '#lib/image/image-open-graph.ts';

export const getStaticPaths = (async () => {
	const { ephemera } = await getEphemeraCollection();
	const { locations } = await getLocationsCollection();
	const { pages } = await getPagesCollection();
	const { posts } = await getPostsCollection();

	const getOpenGraphImage = await getOpenGraphImageFunction();

	// Load pre-generated images once (single directory read)
	const preGeneratedImages = await getPreGeneratedOpenGraphImages();

	const limit = pLimit(40);

	return await Promise.all(
		R.pipe(
			[...ephemera, ...locations, ...pages, ...posts] as const,
			R.filter((entry) => !!entry.data.imageFeatured && !preGeneratedImages.has(entry.id)),
			R.map((entry) =>
				limit(async () => {
					const featuredImageId = getImageFeaturedId({
						imageFeatured: entry.data.imageFeatured,
					});
					const imageOpenGraph = await getOpenGraphImage({
						entryId: entry.id,
						imageId: featuredImageId,
						format: OPEN_GRAPH_IMAGE_FORMAT,
						formatOptions: { quality: 85 },
					});

					return {
						params: {
							opengraph: OPEN_GRAPH_BASE_PATH,
							id: entry.id,
							ext: OPEN_GRAPH_IMAGE_FORMAT,
						},
						props: {
							imageOpenGraph,
						},
					};
				}),
			),
		),
	);
}) satisfies GetStaticPaths;

export const GET = (({ props: { imageOpenGraph } }) => {
	if (!imageOpenGraph) return new Response(undefined, { status: 404 });

	return new Response(new Uint8Array(imageOpenGraph.data), {
		status: 200,
		headers: {
			'Content-Type': `image/${imageOpenGraph.format}`,
		},
	});
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
