import type { OpenGraphCardTitles } from '@spectralcodex/shared/open-graph';

import { openGraphVariants } from '@spectralcodex/shared/open-graph';

import type { TemplateContext } from '#og-image/generate.ts';
import type { TitleTokens } from '#og-image/templates/shared.tsx';

import {
	cropLandscape,
	fitTitles,
	Frame,
	landscapeBrandTokens,
	landscapeSafeZone,
	Title,
	TitleMultilingual,
	TitleSite,
} from '#og-image/templates/shared.tsx';

const isShowBranding = true as boolean;

const { height, width } = openGraphVariants.landscape;

// Looser side margins for longer text
const titleTokens = {
	fontSize: 40,
	lineClamp: 2,
	lineClampMultilingual: 1,
	lineHeight: 1.3,
	maxWidth: width,
	padding: '0 100px 60px',
	paddingMultilingual: '0 100px',
	scriptFontSize: { ja: 48, th: 40, zh: 48 },
} satisfies TitleTokens;

export async function getStandardElement(
	titles: OpenGraphCardTitles,
	{ measure, source }: TemplateContext,
) {
	const image = await cropLandscape(source, 'top');
	const fitted = await fitTitles(measure, titles, titleTokens);

	return (
		<Frame
			height={height}
			image={image}
			safeZone={landscapeSafeZone}
			scrim={
				'linear-gradient(to bottom, rgb(24, 24, 27, 0) 75%, rgb(24, 24, 27, 0.4) 88%, rgb(12, 12, 14, 0.6) 100%)'
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
				{isShowBranding ? (
					<TitleSite luminance={image?.luminanceTop} tokens={landscapeBrandTokens} />
				) : undefined}
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
