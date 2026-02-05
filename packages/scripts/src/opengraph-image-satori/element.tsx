import type { OpenGraphMetadataItem } from './types.js';

const SHOW_SAFE_ZONE_OVERLAY = false as boolean;

function SafeZoneOverlay() {
	if (!SHOW_SAFE_ZONE_OVERLAY) return;

	// Canvas: 1200 × 630
	// Safe zone (10% inset): 120px left/right, 63px top/bottom
	// Safe zone rectangle: (120, 63) to (1080, 567) → 960 × 504 px
	const overlayStyle = {
		position: 'absolute' as const,
		background: 'rgba(255, 0, 0, 0.5)',
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

function Brand() {
	const commonStyles = {
		fontFamily: 'Lora',
		fontSize: '24px',
		fontWeight: 700,
		letterSpacing: '30px',
		lineHeight: 1.25,
		padding: '0 120px',
	} as const;

	return (
		<div style={{ display: 'flex', position: 'absolute', top: '60px' }}>
			<div
				style={{
					color: 'transparent',
					position: 'absolute',
					textShadow: `1px 1px 3px rgb(24, 24, 27, 0.4)`,
					...commonStyles,
				}}
			>
				SPECTRAL CODEX
			</div>
			<div
				style={{
					color: '#ffffff',
					...commonStyles,
				}}
			>
				SPECTRAL CODEX
			</div>
		</div>
	);
}

function TitleMultiLingual({
	titleZh,
	titleJa,
	titleTh,
}: {
	titleZh?: string | undefined;
	titleJa?: string | undefined;
	titleTh?: string | undefined;
}) {
	const commonStyles = {
		display: 'block', // Necessary for line clamp
		lineClamp: 1,
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

	return (
		<div style={{ display: 'flex' }}>
			<div
				style={{
					color: 'transparent',
					position: 'absolute',
					textShadow: `1px 1px 4px rgb(12, 12, 14, 0.6)`,
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
					backgroundImage: 'linear-gradient(to bottom, #fef9ec, #f4da93)',
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

function Title({ title }: { title: string }) {
	const commonStyles = {
		display: 'block', // Necessary for line clamp
		fontFamily: 'Lora',
		fontSize: '40px',
		fontWeight: 700,
		lineClamp: 2,
		lineHeight: 1.15,
		padding: '0 120px 60px 120px',
	} as const;

	return (
		<div style={{ display: 'flex' }}>
			<div
				style={{
					color: 'transparent',
					position: 'absolute',
					textShadow: `1px 1px 6px rgb(24, 24, 27, 0.4)`,
					...commonStyles,
				}}
			>
				{title}
			</div>
			<div
				style={{
					backgroundClip: 'text',
					backgroundImage: 'linear-gradient(to bottom, #ffffff, #fef9ec)',
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
	},
) {
	return (
		<div
			style={{
				background: '#18181b',
				display: 'flex',
				width: '1200px',
				height: '630px',
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
						'linear-gradient(to bottom, rgb(64, 64, 71, 0) 70%, rgb(24, 24, 27, 0.4) 80%, rgb(12, 12, 14, 0.7) 100%)',
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
				<Brand />
				<TitleMultiLingual
					titleZh={entry.titleZh}
					titleJa={entry.titleJa}
					titleTh={entry.titleTh}
				/>
				<Title title={entry.title} />
			</div>
		</div>
	);
}
