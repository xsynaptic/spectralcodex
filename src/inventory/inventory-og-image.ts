import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { createRenderer, loadOpenGraphFonts, processImage } from '@spectralcodex/scripts/og-image';

import { getSampleOpenGraphCards } from '#inventory/inventory-fixtures.ts';

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

	return cards.map((card) => ({ params: { key: card.key }, props: { card } }));
}) satisfies GetStaticPaths;

export const GET = (async ({ props: { card } }) => {
	const image = await processImage({
		imageInput: card.imagePath,
		isFallback: card.entry.isFallback,
	});

	const render = await getRenderCard();

	// Takumi returns a Uint8Array that may be backed by a SharedArrayBuffer, which Response rejects
	return new Response(new Uint8Array(await render(card.entry, image)), {
		headers: { 'cache-control': 'no-store', 'content-type': 'image/jpeg' },
	});
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
