import type { ResolvedOpenGraphCardInput } from '@spectralcodex/shared/open-graph';

import { openGraphVariants } from '@spectralcodex/shared/open-graph';

import type { TemplateContext } from '#og-image/generate.ts';

import {
	cropLandscape,
	Frame,
	gradientButtercream,
	gradientFill,
	gradientWhite,
	landscapeBrandTokens,
	landscapeSafeZone,
	TitleSite,
} from '#og-image/templates/shared.tsx';

type AtlasInput = Extract<ResolvedOpenGraphCardInput, { template: 'atlas' }>;

const { height, width } = openGraphVariants.landscape;

export async function getAtlasElement(
	{ countLabel, title, titleZh }: AtlasInput,
	{ source }: TemplateContext,
) {
	const image = await cropLandscape(source, 'centre');

	return (
		<Frame
			height={height}
			image={image}
			safeZone={landscapeSafeZone}
			scrim={
				'linear-gradient(to bottom, rgb(12, 12, 14, 0.1) 0%, rgb(12, 12, 14, 0) 25%, rgb(12, 12, 14, 0) 45%, rgb(12, 12, 14, 0.25) 70%, rgb(12, 12, 14, 0.6) 100%)'
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
					padding: '0 120px 72px',
					position: 'relative',
					textAlign: 'center',
					width: '100%',
				}}
			>
				<TitleSite luminance={image?.luminanceTop} tokens={landscapeBrandTokens} />
				{titleZh ? (
					<div
						lang="zh-Hant"
						style={{
							filter: 'drop-shadow(1px 1px 4px rgb(12, 12, 14, 0.6))',
							fontFamily: 'Noto Serif TC',
							fontSize: '48px',
							fontWeight: 700,
							letterSpacing: '12px',
							lineHeight: 1.25,
							paddingLeft: '12px',
							...gradientFill(gradientButtercream),
						}}
					>
						{titleZh}
					</div>
				) : undefined}
				<div
					style={{
						filter: 'drop-shadow(1px 1px 8px rgb(12, 12, 14, 0.5))',
						fontFamily: 'Lora',
						fontSize: '96px',
						fontWeight: 700,
						lineHeight: 1.2,
						...gradientFill(gradientWhite),
					}}
				>
					{title}
				</div>
				<div
					style={{
						border: '2px solid rgb(244, 218, 147, 0.7)',
						borderRadius: '999px',
						color: '#fef9ec',
						fontFamily: 'Lora',
						fontSize: '26px',
						fontWeight: 700,
						letterSpacing: '2px',
						lineHeight: 1,
						marginTop: '16px',
						padding: '12px 28px',
						textShadow: '0px 0px 4px rgb(12, 12, 14, 0.8)',
					}}
				>
					{countLabel}
				</div>
			</div>
		</Frame>
	);
}
