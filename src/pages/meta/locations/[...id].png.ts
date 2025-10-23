import type { OpenGraphMetadataItem } from '@spectralcodex/image-open-graph';
import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { loadOpenGraphImageFonts } from '@spectralcodex/image-open-graph';
import { CACHE_DIR } from 'astro:env/server';
import path from 'node:path';
import pLimit from 'p-limit';
import * as R from 'remeda';

import { FEATURE_OPEN_GRAPH_IMAGES } from '#constants.ts';
import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from '#constants.ts';
import { getImageById } from '#lib/collections/images/utils.ts';
import { getLocationsCollection } from '#lib/collections/locations/data.ts';
import { getImageObject } from '#lib/image/image-file-handling.ts';
import { getGenerateOpenGraphImageFunction } from '#lib/image/image-open-graph-satori.ts';
import { getContentMetadataFunction } from '#lib/metadata/metadata-items.ts';

export const getStaticPaths = (async () => {
	if (!FEATURE_OPEN_GRAPH_IMAGES) return [];

	const { locations } = await getLocationsCollection();

	const getContentMetadata = await getContentMetadataFunction();

	const openGraphImageFonts = await loadOpenGraphImageFonts({
		cacheDir: path.join(CACHE_DIR, 'opengraph-fonts'),
		fontConfigs: [
			{
				family: 'Geologica',
				variants: [
					{ weight: 300, style: 'normal', subset: 'latin' },
					{ weight: 500, style: 'normal', subset: 'latin' },
					{ weight: 700, style: 'normal', subset: 'latin' },
				],
			},
		],
	});

	const generateOpenGraphImage = getGenerateOpenGraphImageFunction({
		fonts: openGraphImageFonts,
		width: OPEN_GRAPH_IMAGE_WIDTH,
		height: OPEN_GRAPH_IMAGE_HEIGHT,
		density: 2,
	});

	const limit = pLimit(40);

	return await Promise.all(
		R.pipe(
			locations,
			getContentMetadata,
			R.filter((item) => !!item.imageId && item.entryQuality >= 5), // TODO: relax this restriction later
			R.map((entry) =>
				limit(async () => {
					// TODO: restrict what properties are passed on?
					const openGraphMetadataItem = {
						...entry,
					} satisfies OpenGraphMetadataItem;

					const imageEntry = entry.imageId ? await getImageById(entry.imageId) : undefined;
					const imageObject = imageEntry ? await getImageObject(imageEntry.data.src) : undefined;

					return {
						params: { id: entry.id },
						props: {
							imageOpenGraph: await generateOpenGraphImage(
								openGraphMetadataItem,
								imageObject,
								imageEntry,
							),
						},
					};
				}),
			),
		),
	);
}) satisfies GetStaticPaths;

export const GET = (({ props: { imageOpenGraph } }) => {
	return new Response(new Uint8Array(imageOpenGraph), {
		status: 200,
		headers: {
			'Content-Type': 'image/png',
		},
	});
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
