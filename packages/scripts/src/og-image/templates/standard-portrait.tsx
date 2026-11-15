import type { OpenGraphCardTitles } from '@spectralcodex/shared/open-graph';

import { openGraphVariants } from '@spectralcodex/shared/open-graph';

import type { TemplateContext } from '#og-image/generate.ts';
import type { TitleTokens } from '#og-image/templates/shared.tsx';

import {
	cropCover,
	fitTitles,
	Frame,
	Title,
	TitleMultilingual,
	TitleSite,
} from '#og-image/templates/shared.tsx';

const { height, width } = openGraphVariants.portrait;

// Instagram's profile grid crops 4:5 posts to 3:4 (the middle 1012px), so text stays well inside that
const safeZone = { bottom: 96, side: 96, top: 72 };

const brandTokens = { fontSize: 28, letterSpacing: 36, top: safeZone.top };

const titleTokens = {
	fontSize: 56,
	lineClamp: 3,
	lineClampMultilingual: 2,
	lineHeight: 1.3,
	maxWidth: width,
	padding: `0 ${String(safeZone.side)}px ${String(safeZone.bottom)}px`,
	paddingMultilingual: `0 ${String(safeZone.side)}px 8px`,
	scriptFontSize: { ja: 68, th: 56, zh: 68 },
} satisfies TitleTokens;

export async function getStandardPortraitElement(
	titles: OpenGraphCardTitles,
	{ measure, source }: TemplateContext,
) {
	const image = await cropCover(source, { height, width }, 'centre');
	const fitted = await fitTitles(measure, titles, titleTokens);

	return (
		<Frame
			height={height}
			image={image}
			safeZone={safeZone}
			scrim={
				'linear-gradient(to bottom, rgb(24, 24, 27, 0.25) 0%, rgb(24, 24, 27, 0) 15%, rgb(24, 24, 27, 0) 60%, rgb(24, 24, 27, 0.45) 80%, rgb(12, 12, 14, 0.65) 100%)'
			}
			width={width}
		>
			<div
				style={{
					alignItems: 'center',
					display: 'flex',
					flexDirection: 'column',
					height: '100%',
					justifyContent: 'flex-end',
					position: 'relative',
					textAlign: 'center',
					width: '100%',
				}}
			>
				<TitleSite luminance={image?.luminanceTop} tokens={brandTokens} />
				<TitleMultilingual
					luminance={image?.luminanceBottom}
					scriptTitle={fitted.scriptTitle}
					tokens={titleTokens}
				/>
				<Title luminance={image?.luminanceBottom} title={fitted.title} tokens={titleTokens} />
			</div>
		</Frame>
	);
}
