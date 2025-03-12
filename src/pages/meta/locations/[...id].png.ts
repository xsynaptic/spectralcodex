import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { getGenerateOpenGraphImageFunction } from '@spectralcodex/image-open-graph';
import * as R from 'remeda';

import { FEATURE_OPEN_GRAPH_IMAGES } from '#constants.ts';
import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from '#constants.ts';
import { getImageById } from '#lib/collections/images/utils.ts';
import { getLocationsCollection } from '#lib/collections/locations/data.ts';
import { getImageObject } from '#lib/image/image-file-handling.ts';
import { openGraphImageFonts } from '#lib/image/image-open-graph-fonts.ts';
import { getContentMetadataFunction } from '#lib/metadata/metadata-items.ts';

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
			R.map(async (item) => {
				const imageEntry = item.imageId ? await getImageById(item.imageId) : undefined;
				const imageObject = imageEntry ? await getImageObject(imageEntry.data.src) : undefined;

				return {
					params: { id: item.id },
					props: { imageOpenGraph: await generateOpenGraphImage(item, imageObject) },
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
