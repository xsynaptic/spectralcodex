import satori from 'satori';
import sharp from 'sharp';

import type { ContentMetadataItem } from '@/types/metadata';

import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from '@/constants';
import { getOpenGraphImageElement } from '@/lib/open-graph/open-graph-image-element';
import { openGraphImageFonts } from '@/lib/open-graph/open-graph-image-fonts';

export const generateOpenGraphImage = async (entry: ContentMetadataItem): Promise<Buffer> => {
	const openGraphElement = await getOpenGraphImageElement(entry);

	const satoriSvg = await satori(openGraphElement, {
		fonts: openGraphImageFonts,
		width: OPEN_GRAPH_IMAGE_WIDTH,
		height: OPEN_GRAPH_IMAGE_HEIGHT,
	});

	return sharp(Buffer.from(satoriSvg), { failOn: 'error' }).png().toBuffer();
};
