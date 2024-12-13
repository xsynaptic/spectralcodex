import { getGenerateOpenGraphImageFunction } from '@spectralcodex/image-open-graph';
import { FEATURE_OPEN_GRAPH_IMAGES } from 'astro:env/server';
import * as R from 'remeda';

import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from '@/constants';
import { getImageById } from '@/lib/collections/images/utils';
import { getLocationsCollection } from '@/lib/collections/locations/data';
import { getImageObject } from '@/lib/image/image-file-handling';
import { openGraphImageFonts } from '@/lib/image/image-open-graph-fonts';
import { getContentMetadataFunction } from '@/lib/metadata/metadata-items';

// TODO: this feature is currently under development
export const getStaticPaths = (async () => {
	if (!FEATURE_OPEN_GRAPH_IMAGES) return [];

	const { locations } = await getLocationsCollection();

	const getContentMetadata = await getContentMetadataFunction();

	const generateOpenGraphImage = getGenerateOpenGraphImageFunction({
		fonts: openGraphImageFonts,
		width: OPEN_GRAPH_IMAGE_WIDTH,
		height: OPEN_GRAPH_IMAGE_HEIGHT,
		density: 2,
	});

	return await Promise.all(
		R.pipe(
			locations,
			getContentMetadata,
			R.map(async (entry) => {
				const image = entry.imageId ? await getImageById(entry.imageId) : undefined;
				const imageObject = image ? await getImageObject(image.data.src.src) : undefined;

				return {
					params: { id: entry.id },
					props: { imageOpenGraph: await generateOpenGraphImage(entry, imageObject) },
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
