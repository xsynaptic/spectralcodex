import { FEATURE_OPEN_GRAPH_IMAGES } from 'astro:env/server';
import * as R from 'remeda';

import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { getLocationsCollection } from '@/lib/collections/locations/data';
import { getContentMetadataFunction } from '@/lib/metadata/metadata-items';
import { generateOpenGraphImage } from '@/lib/open-graph/open-graph-image';

// TODO: this feature is currently under development
export const getStaticPaths = (async () => {
	if (!FEATURE_OPEN_GRAPH_IMAGES) return [];

	const { locations } = await getLocationsCollection();

	const getContentMetadata = await getContentMetadataFunction();

	return await Promise.all(
		R.pipe(
			locations,
			getContentMetadata,
			R.map(async (entry) => {
				const imageOpenGraph = await generateOpenGraphImage(entry);

				return {
					params: { id: entry.id },
					props: { imageOpenGraph },
				};
			}),
		),
	);
}) satisfies GetStaticPaths;

export const GET = (({ props: { imageOpenGraph } }) => {
	return new Response(imageOpenGraph, {
		status: 200,
		headers: {
			'Content-Type': 'image/png',
		},
	});
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
