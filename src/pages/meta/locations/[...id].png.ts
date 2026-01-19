import type { OpenGraphMetadataItem } from '@spectralcodex/image-open-graph';
import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { loadOpenGraphImageFonts } from '@spectralcodex/image-open-graph';
import { CACHE_DIR } from 'astro:env/server';
import path from 'node:path';
import pLimit from 'p-limit';
import * as R from 'remeda';

import { FEATURE_OPEN_GRAPH_IMAGES } from '#constants.ts';
import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from '#constants.ts';
import { getImageByIdFunction } from '#lib/collections/images/images-utils.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getImageObject } from '#lib/image/image-file-handling.ts';
import { getGenerateOpenGraphImageFunction } from '#lib/image/image-open-graph-satori.ts';
import { getContentMetadataFunction } from '#lib/metadata/metadata-utils.ts';

// Note: this is not currently used as of December 2025
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

	const getImageById = await getImageByIdFunction();

	const limit = pLimit(40);

	return await Promise.all(
		R.pipe(
			locations,
			getContentMetadata,
			R.filter((item) => !!item.imageId && item.entryQuality >= 5), // TODO: relax this restriction later
			R.map((entry) =>
				limit(async () => {
					const openGraphMetadataItem = {
						collection: entry.collection,
						id: entry.id,
						title: entry.title,
						subtitle: entry.titleMultilingual?.lang.startsWith('zh')
							? entry.titleMultilingual.value
							: undefined,
						category: entry.collection,
						description: entry.description,
						dateCreated: entry.dateCreated,
						dateUpdated: entry.dateUpdated,
						icon: undefined,
					} satisfies OpenGraphMetadataItem;

					const imageEntry = entry.imageId ? getImageById(entry.imageId) : undefined;
					const imageObject = imageEntry ? await getImageObject(imageEntry.data.path) : undefined;

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
