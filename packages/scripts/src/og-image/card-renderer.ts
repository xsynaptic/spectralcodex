import type { CardRenderOptions } from '@xsynaptic/astro-image-pipeline/node';

import {
	openGraphBlurTreatment,
	OpenGraphCardRecordSchema,
} from '@spectralcodex/shared/open-graph';

import type { OpenGraphSource } from '#og-image/generate.ts';

import { loadOpenGraphFonts } from '#og-image/fonts.ts';
import { createRenderer, decodeSource } from '#og-image/generate.ts';

// Fonts and glyph outlines live on the renderer, so the first card builds one for every card after it
let renderCard: Promise<ReturnType<typeof createRenderer>> | undefined;

async function createRenderCard() {
	return createRenderer({ fonts: await loadOpenGraphFonts() });
}

export default {
	decode: (source) =>
		Promise.resolve(
			decodeSource({
				imageInput: source.filePath,
				isBlurred: source.treatment === openGraphBlurTreatment,
			}),
		),
	async render(input, source) {
		if (!renderCard) {
			renderCard = createRenderCard();
		}

		const render = await renderCard;

		return render(OpenGraphCardRecordSchema.parse(input), source);
	},
} satisfies Pick<CardRenderOptions<OpenGraphSource>, 'decode' | 'render'>;
