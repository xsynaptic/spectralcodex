import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { createRenderer, decodeSource, loadOpenGraphFonts } from '@spectralcodex/scripts/og-image';
import {
	openGraphTemplateVariants,
	resolveOpenGraphCardInput,
} from '@spectralcodex/shared/open-graph';

import { getSampleOpenGraphCards } from '#dev/inventory/inventory-fixtures.ts';

// Fonts and glyph outlines live on the renderer, so build one and hold it for the dev server
let renderCard: Promise<ReturnType<typeof createRenderer>> | undefined;

async function createRenderCard() {
	return createRenderer({ fonts: await loadOpenGraphFonts() });
}

function getRenderCard() {
	if (!renderCard) {
		renderCard = createRenderCard();
	}

	return renderCard;
}

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

	const render = await getRenderCard();

	// Takumi returns a Uint8Array that may be backed by a SharedArrayBuffer, which Response rejects
	return new Response(new Uint8Array(await render({ ...card.input, variant }, source)), {
		headers: { 'cache-control': 'no-store', 'content-type': 'image/jpeg' },
	});
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
