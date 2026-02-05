import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from '@spectralcodex/shared/constants';

import type { OpenGraphMetadataItem } from './types.js';

const SHOW_SAFE_ZONE_OVERLAY = false as boolean;

function SafeZoneOverlay({ opacity = '0.5' }: { opacity?: string | undefined }) {
	if (!SHOW_SAFE_ZONE_OVERLAY) return;

	// Safe zone (10% inset): 120px left/right, 63px top/bottom
	// Safe zone rectangle: (120, 63) to (1080, 567) → 960 × 504 px
	const overlayStyle = {
		position: 'absolute' as const,
		background: `rgb(255, 0, 0, ${opacity})`,
	};

	return (
		<>
			<div style={{ ...overlayStyle, top: '0px', left: '0px', width: '1200px', height: '63px' }} />
			<div
				style={{ ...overlayStyle, bottom: '0px', left: '0px', width: '1200px', height: '63px' }}
			/>
			<div style={{ ...overlayStyle, top: '63px', left: '0px', width: '120px', height: '504px' }} />
			<div
				style={{ ...overlayStyle, top: '63px', left: '1080px', width: '120px', height: '504px' }}
			/>
		</>
	);
}

function TitleSite({ luminance }: { luminance?: number | undefined }) {
	const brandLabel = 'Spectral Codex'.toUpperCase().trim();

	// Letter spacing is also added AFTER characters
	const letterSpacing = '56px';

	const commonStyles = {
		fontFamily: 'Lora',
		fontSize: '26px',
		fontWeight: 700,
		letterSpacing,
		lineHeight: 1.25,
		maxWidth: `${String(OPEN_GRAPH_IMAGE_WIDTH)}px`,
		paddingLeft: letterSpacing, // Account for letter spacing; this re-centers the text
	} as const;

	const showInverted = luminance && luminance >= 200;

	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				top: '60px',
			}}
		>
			<div
				style={{
					color: 'transparent',
					position: 'absolute',
					textShadow: showInverted
						? `0px 0px 3px rgb(220, 220, 225, 0.8)`
						: `0px 0px 3px rgb(24, 24, 27, 0.4)`,
					...commonStyles,
				}}
			>
				{brandLabel}
			</div>
			<div
				style={{
					color: showInverted ? 'rgb(24, 24, 27)' : '#ffffff',
					...commonStyles,
				}}
			>
				{brandLabel}
			</div>
		</div>
	);
}

/**
 * Multilingual title support requires different params and styles for each language
 */
function TitleMultilingual({
	titleZh,
	titleJa,
	titleTh,
	luminance,
}: {
	titleZh?: string | undefined;
	titleJa?: string | undefined;
	titleTh?: string | undefined;
	luminance?: number | undefined;
}) {
	const commonStyles = {
		display: 'block', // Necessary for line clamp
		lineClamp: 1,
		maxWidth: '960px',
		padding: '0 120px',
	} as const;

	const titleMultilingual = titleZh || titleJa || titleTh;

	if (!titleMultilingual) return;

	let langStyles = {};
	let lang: string | undefined;

	if (titleZh) {
		langStyles = {
			fontFamily: 'Noto Serif TC',
			fontSize: '48px',
			fontWeight: 700,
			lineHeight: 1.25,
		};
		lang = 'zh-Hant';
	} else if (titleJa) {
		langStyles = {
			fontFamily: 'Zen Antique',
			fontSize: '48px',
			fontWeight: 400,
			lineHeight: 1.25,
		};
		lang = 'ja';
	} else if (titleTh) {
		langStyles = {
			fontFamily: 'Noto Serif Thai',
			fontSize: '40px',
			fontWeight: 500,
			lineHeight: 1,
		};
		lang = 'th';
	}

	const showInverted = luminance && luminance >= 200;

	return (
		<div style={{ display: 'flex' }}>
			<div
				style={{
					color: 'transparent',
					position: 'absolute',
					textShadow: showInverted
						? `0px 0px 4px rgb(220, 220, 225, 0.7)`
						: `1px 1px 4px rgb(12, 12, 14, 0.6)`,
					...langStyles,
					...commonStyles,
				}}
				lang={lang}
			>
				{titleMultilingual}
			</div>
			<div
				style={{
					backgroundClip: 'text',
					backgroundImage: showInverted
						? 'rgb(12, 12, 14)'
						: 'linear-gradient(to bottom, #fef9ec, #f4da93)',
					color: 'transparent',
					...langStyles,
					...commonStyles,
				}}
				lang={lang}
			>
				{titleMultilingual}
			</div>
		</div>
	);
}

function Title({ title, luminance }: { title: string; luminance?: number | undefined }) {
	const commonStyles = {
		display: 'block', // Necessary for line clamp
		fontFamily: 'Lora',
		fontSize: '40px',
		fontWeight: 700,
		lineClamp: 2,
		lineHeight: 1.15,
		maxWidth: '960px',
		padding: '0 120px 60px 120px',
	} as const;

	const showInverted = luminance && luminance >= 200;

	return (
		<div style={{ display: 'flex' }}>
			<div
				style={{
					color: 'transparent',
					position: 'absolute',
					textShadow: showInverted
						? `0px 0px 5px rgb(240, 240, 245, 0.8)`
						: `1px 1px 6px rgb(24, 24, 27, 0.4)`,
					...commonStyles,
				}}
			>
				{title}
			</div>
			<div
				style={{
					backgroundClip: 'text',
					backgroundImage: showInverted
						? 'rgb(24, 24, 27)'
						: 'linear-gradient(to bottom, #ffffff, #fef9ec)',
					color: 'transparent',
					...commonStyles,
				}}
			>
				{title}
			</div>
		</div>
	);
}

export function getOpenGraphElement(
	entry: OpenGraphMetadataItem,
	image?: {
		src: string;
		height: number;
		width: number;
		/** Luminance of top zone (10%-20%), 0-255 */
		luminanceTop?: number | undefined;
		/** Luminance of bottom zone (70%-90%), 0-255 */
		luminanceBottom?: number | undefined;
	},
) {
	return (
		<div
			style={{
				background: '#18181b',
				display: 'flex',
				width: `${String(OPEN_GRAPH_IMAGE_WIDTH)}px`,
				height: `${String(OPEN_GRAPH_IMAGE_HEIGHT)}px`,
			}}
		>
			{image && image.src.length > 0 ? (
				<img
					src={image.src}
					height={image.height}
					width={image.width}
					style={{
						position: 'absolute',
					}}
				/>
			) : undefined}
			{/* Gradient overlay */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					background:
						'linear-gradient(to bottom, rgb(24, 24, 27, 0) 75%, rgb(24, 24, 27, 0.4) 88%, rgb(12, 12, 14, 0.6) 100%)',
				}}
			/>
			<SafeZoneOverlay />
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'flex-end',
					textAlign: 'center',
					height: '100%',
					width: '100%',
				}}
			>
				<TitleSite luminance={image?.luminanceTop} />
				<TitleMultilingual
					titleZh={entry.titleZh}
					titleJa={entry.titleJa}
					titleTh={entry.titleTh}
					luminance={image?.luminanceBottom}
				/>
				<Title title={entry.title} luminance={image?.luminanceBottom} />
			</div>
		</div>
	);
}
