import { openGraphImageHeight, openGraphImageWidth } from '@spectralcodex/shared/constants';
import { Bitmap } from 'takumi-js/helpers/jsx';

import type { ProcessedImage } from '#og-image/generate.ts';
import type { OpenGraphMetadataItem } from '#og-image/types.ts';

const isShowBranding = true as boolean;

const isShowSafeZoneOverlay = false as boolean;

// Threshold at which to show inverted text
const luminanceThreshold = 190;

// Gradient text needs backgroundClip; a flat inverted fill is a plain color
function fillStyles(isInverted: boolean, color: string, gradient: string) {
	return isInverted
		? { color }
		: { backgroundClip: 'text' as const, backgroundImage: gradient, color: 'transparent' };
}

function isBrightBackground(luminance?: number): boolean {
	return !!luminance && luminance >= luminanceThreshold;
}

// Safe zone (10% inset): 120px left/right, 63px top/bottom
// Safe zone rectangle: (120, 63) to (1080, 567) → 960 × 504 px
function SafeZoneOverlay({ opacity = '0.5' }: { opacity?: string | undefined }) {
	const overlayStyle = {
		background: `rgb(255, 0, 0, ${opacity})`,
		position: 'absolute' as const,
	};

	return (
		<>
			<div style={{ ...overlayStyle, height: '63px', left: '0px', top: '0px', width: '1200px' }} />
			<div
				style={{ ...overlayStyle, bottom: '0px', height: '63px', left: '0px', width: '1200px' }}
			/>
			<div style={{ ...overlayStyle, height: '504px', left: '0px', top: '63px', width: '120px' }} />
			<div
				style={{ ...overlayStyle, height: '504px', left: '1080px', top: '63px', width: '120px' }}
			/>
		</>
	);
}

// Takumi floors the shadow blur radius and odd values lose their lower-right tail; keep every one even
function TitleSite({ luminance }: { luminance?: number | undefined }) {
	const brandLabel = 'Spectral Codex'.toUpperCase().trim();

	// Letter spacing is also added AFTER characters
	const letterSpacing = '56px';

	const isInverted = isBrightBackground(luminance);

	return (
		<div
			style={{
				color: isInverted ? 'rgb(24, 24, 27)' : '#ffffff',
				display: 'flex',
				fontFamily: 'Lora',
				fontSize: '26px',
				fontWeight: 700,
				justifyContent: 'center',
				left: '0px',
				letterSpacing,
				lineHeight: 1.25,
				paddingLeft: letterSpacing, // Account for letter spacing; this re-centers the text
				position: 'absolute',
				textShadow: isInverted
					? '0px 0px 4px rgb(220, 220, 225, 0.8)'
					: '0px 0px 4px rgb(12, 12, 14, 0.8)',
				top: '60px',
				width: '100%',
			}}
		>
			{brandLabel}
		</div>
	);
}

// Each script gets its own face and optical size; `lang` also drives Han unification
const scriptStyles = {
	ja: {
		fontFamily: 'Zen Antique',
		fontSize: '48px',
		fontWeight: 400,
		lang: 'ja',
		lineHeight: 1.25,
	},
	th: {
		fontFamily: 'Noto Serif Thai',
		fontSize: '40px',
		fontWeight: 500,
		lang: 'th',
		lineHeight: 1,
	},
	zh: {
		fontFamily: 'Noto Serif TC',
		fontSize: '48px',
		fontWeight: 700,
		lang: 'zh-Hant',
		lineHeight: 1.25,
	},
} as const;

export function getOpenGraphElement(entry: OpenGraphMetadataItem, image?: ProcessedImage) {
	return (
		<div
			style={{
				background: '#18181b',
				display: 'flex',
				height: `${String(openGraphImageHeight)}px`,
				width: `${String(openGraphImageWidth)}px`,
			}}
		>
			{image ? (
				<Bitmap
					data={image.data}
					height={image.height}
					style={{ position: 'absolute' }}
					width={image.width}
				/>
			) : undefined}
			{/* Gradient overlay */}
			<div
				style={{
					background:
						'linear-gradient(to bottom, rgb(24, 24, 27, 0) 75%, rgb(24, 24, 27, 0.4) 88%, rgb(12, 12, 14, 0.6) 100%)',
					height: '100%',
					left: 0,
					position: 'absolute',
					top: 0,
					width: '100%',
				}}
			/>
			{isShowSafeZoneOverlay ? <SafeZoneOverlay /> : undefined}
			<div
				style={{
					alignItems: 'center',
					display: 'flex',
					flexDirection: 'column',
					height: '100%',
					justifyContent: 'flex-end',
					textAlign: 'center',
					width: '100%',
				}}
			>
				{isShowBranding ? <TitleSite luminance={image?.luminanceTop} /> : undefined}
				<TitleMultilingual
					luminance={image?.luminanceBottom}
					titleJa={entry.titleJa}
					titleTh={entry.titleTh}
					titleZh={entry.titleZh}
				/>
				<Title luminance={image?.luminanceBottom} title={entry.title} />
			</div>
		</div>
	);
}

function resolveScript({
	titleJa,
	titleTh,
	titleZh,
}: {
	titleJa?: string | undefined;
	titleTh?: string | undefined;
	titleZh?: string | undefined;
}) {
	if (titleZh) return { ...scriptStyles.zh, title: titleZh };
	if (titleJa) return { ...scriptStyles.ja, title: titleJa };
	if (titleTh) return { ...scriptStyles.th, title: titleTh };

	return;
}

function Title({ luminance, title }: { luminance?: number | undefined; title: string }) {
	const isInverted = isBrightBackground(luminance);

	return (
		<div
			style={{
				fontFamily: 'Lora',
				fontSize: '40px',
				fontWeight: 700,
				lineClamp: 2,
				lineHeight: 1.15,
				maxWidth: `${String(openGraphImageWidth)}px`,
				padding: '0 100px 60px', // Looser side margins for longer text
				textOverflow: 'ellipsis',
				textShadow: isInverted
					? '0px 0px 6px rgb(240, 240, 245, 0.8)'
					: '1px 1px 6px rgb(24, 24, 27, 0.4)',
				...fillStyles(
					isInverted,
					'rgb(24, 24, 27)',
					'linear-gradient(to bottom, #ffffff, #fef9ec)',
				),
			}}
		>
			{title}
		</div>
	);
}

function TitleMultilingual({
	luminance,
	...titles
}: {
	luminance?: number | undefined;
	titleJa?: string | undefined;
	titleTh?: string | undefined;
	titleZh?: string | undefined;
}) {
	const script = resolveScript(titles);

	if (!script) return;

	const { lang, title, ...scriptStyles } = script;
	const isInverted = isBrightBackground(luminance);

	return (
		<div
			lang={lang}
			style={{
				lineClamp: 1,
				maxWidth: `${String(openGraphImageWidth)}px`,
				padding: '0 100px', // Looser side margins for longer text
				textOverflow: 'ellipsis',
				textShadow: isInverted
					? '0px 0px 4px rgb(220, 220, 225, 0.7)'
					: '1px 1px 4px rgb(12, 12, 14, 0.6)',
				...scriptStyles,
				...fillStyles(
					isInverted,
					'rgb(12, 12, 14)',
					'linear-gradient(to bottom, #fef9ec, #f4da93)',
				),
			}}
		>
			{title}
		</div>
	);
}
