import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { decodeSource, openGraphCardRenderer } from '@spectralcodex/scripts/og-image';
import {
	openGraphTemplateVariants,
	resolveOpenGraphCardInput,
} from '@spectralcodex/shared/open-graph';

import { getSampleOpenGraphCards } from '#dev/inventory/inventory-fixtures.ts';

export const getStaticPaths = (async () => {
	const cards = await getSampleOpenGraphCards();

	return cards.flatMap((card) =>
		openGraphTemplateVariants[resolveOpenGraphCardInput(card.input).template].map((variant) => ({
			params: { key: card.key, variant },
			props: { card, variant },
		})),
	);
}) satisfies GetStaticPaths;

export const GET = (async ({ props: { card, variant } }) => {
	const source = decodeSource({ imageInput: card.imagePath, isBlurred: card.isBlurred });

	const body = await openGraphCardRenderer.render({ ...card.input, variant }, source);

	// The pipeline's render returns `Uint8Array<ArrayBufferLike>`, which `BodyInit` rejects as possibly shared
	return new Response(new Uint8Array(body), {
		headers: { 'cache-control': 'no-store', 'content-type': 'image/jpeg' },
	});
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
