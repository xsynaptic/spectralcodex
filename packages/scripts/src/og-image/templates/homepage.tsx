import type { ResolvedOpenGraphCardInput } from '@spectralcodex/shared/open-graph';

import { openGraphVariants } from '@spectralcodex/shared/open-graph';

import type { TemplateContext } from '#og-image/generate.ts';

import {
	cropLandscape,
	Frame,
	gradientButtercream,
	gradientFill,
	gradientWhite,
	landscapeSafeZone,
} from '#og-image/templates/shared.tsx';

type HomepageInput = Extract<ResolvedOpenGraphCardInput, { template: 'homepage' }>;

const { height, width } = openGraphVariants.landscape;

export async function getHomepageElement(
	{ description, title }: HomepageInput,
	{ source }: TemplateContext,
) {
	const image = await cropLandscape(source, 'centre');

	return (
		<Frame
			height={height}
			image={image}
			safeZone={landscapeSafeZone}
			scrim={
				'linear-gradient(to bottom, rgb(12, 12, 14, 0) 45%, rgb(12, 12, 14, 0.3) 70%, rgb(12, 12, 14, 0.6) 100%)'
			}
			width={width}
		>
			<div
				style={{
					alignItems: 'center',
					display: 'flex',
					flexDirection: 'column',
					gap: '16px',
					height: '100%',
					justifyContent: 'flex-end',
					padding: '0 140px 84px',
					position: 'relative',
					textAlign: 'center',
					width: '100%',
				}}
			>
				<div
					style={{
						filter: 'drop-shadow(1px 1px 8px rgb(12, 12, 14, 0.6))',
						fontFamily: 'Lora',
						fontSize: '88px',
						fontWeight: 700,
						letterSpacing: '2px',
						lineHeight: 1.2,
						...gradientFill(gradientButtercream),
					}}
				>
					{title}
				</div>
				<div
					style={{
						filter: 'drop-shadow(1px 1px 6px rgb(12, 12, 14, 0.6))',
						fontFamily: 'Lora',
						fontSize: '30px',
						fontWeight: 700,
						lineClamp: 2,
						lineHeight: 1.3,
						textOverflow: 'ellipsis',
						...gradientFill(gradientWhite),
					}}
				>
					{description}
				</div>
			</div>
		</Frame>
	);
}
