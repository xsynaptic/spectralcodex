import type { OpenGraphCardTitles } from '@spectralcodex/shared/open-graph';

import { openGraphVariants } from '@spectralcodex/shared/open-graph';
import { Bitmap } from 'takumi-js/helpers/jsx';

import type { ProcessedImage, TemplateContext } from '#og-image/generate.ts';
import type { TitleTokens } from '#og-image/templates/shared.tsx';

import {
	fitTitles,
	Frame,
	px,
	Title,
	TitleMultilingual,
	TitleSite,
} from '#og-image/templates/shared.tsx';

const siteHost = 'spectralcodex.com';

const { height, width } = openGraphVariants.story;

const safeZone = { bottom: 385, side: 60, top: 270 };

const brandTokens = { fontSize: 30, letterSpacing: 32, top: 310 };

const photoTop = 400;

const photoBox = { height: 560, width: width - safeZone.side * 2 };

const titleTokens = {
	fontSize: 56,
	lineClamp: 3,
	lineClampMultilingual: 2,
	lineHeight: 1.3,
	maxWidth: width,
	padding: '0 72px',
	paddingMultilingual: '0 72px 16px',
	scriptFontSize: { ja: 68, th: 56, zh: 68 },
} satisfies TitleTokens;

export async function getStandardStoryElement(
	titles: OpenGraphCardTitles,
	{ measure, source }: TemplateContext,
) {
	const background = await source?.crop({ blur: 24, fit: 'cover', height, width });
	const photo = await source?.crop({
		...(source.isBlurred ? { blur: 16 } : {}),
		fit: 'inside',
		...photoBox,
	});
	const fitted = await fitTitles(measure, titles, titleTokens);

	return (
		<Frame
			height={height}
			image={background}
			safeZone={safeZone}
			scrim="rgb(12, 12, 14, 0.55)"
			width={width}
		>
			<TitleSite tokens={brandTokens} />
			<div
				style={{
					alignItems: 'center',
					display: 'flex',
					flexDirection: 'column',
					left: 0,
					position: 'absolute',
					textAlign: 'center',
					top: px(photoTop),
					width: '100%',
				}}
			>
				<Photo image={photo} />
				<div
					style={{
						alignItems: 'center',
						display: 'flex',
						flexDirection: 'column',
						marginTop: '64px',
					}}
				>
					<TitleMultilingual scriptTitle={fitted.scriptTitle} tokens={titleTokens} />
					<Title title={fitted.title} tokens={titleTokens} />
				</div>
				<div
					style={{
						color: 'rgb(250, 250, 250, 0.85)',
						fontFamily: 'Lora',
						fontSize: '30px',
						fontWeight: 700,
						letterSpacing: '4px',
						marginTop: '56px',
						textShadow: '0px 0px 4px rgb(12, 12, 14, 0.8)',
					}}
				>
					{siteHost}
				</div>
			</div>
		</Frame>
	);
}

function Photo({ image }: { image: ProcessedImage | undefined }) {
	if (!image) return;

	return (
		<Bitmap
			data={image.data}
			height={image.height}
			style={{ borderRadius: '3px', boxShadow: '0px 4px 16px rgb(0, 0, 0, 0.2)', flexShrink: 0 }}
			width={image.width}
		/>
	);
}
