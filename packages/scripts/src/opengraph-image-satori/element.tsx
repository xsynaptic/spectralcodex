import type { OpenGraphMetadataItem } from './types.js';

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
				height: '100%',
			}}
		>
			{image && image.src.length > 0 ? (
				<img
					src={image.src}
					height={image.height}
					width={image.width}
					style={{
						position: 'absolute',
						maskImage: 'linear-gradient(to top, rgb(0, 0, 0, 0.3) 8%, #18181b)',
					}}
				/>
			) : undefined}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'flex-end',
					height: '100%',
					width: '100%',
				}}
			>
				<div
					style={{
						backgroundClip: 'text',
						backgroundImage: 'linear-gradient(to bottom, #fef9ec, #f4da93)',
						color: 'transparent',
						fontFamily: 'Noto Sans TC',
						fontSize: '40px',
						fontWeight: 500,
						marginBottom: '-4px',
						padding: '0 20px',
						textShadow: `0 0 3px rgb(0, 0, 0, 0.1)`,
					}}
				>
					{entry.subtitle}
				</div>
				<div
					style={{
						color: '#fef9ec',
						display: 'block', // Necessary for line clamp
						fontFamily: 'Geologica',
						fontSize: '64px',
						fontWeight: 700,
						lineClamp: 2,
						padding: '0 20px 16px 20px',
						textShadow: `0 0 6px rgb(0, 0, 0, 0.6)`,
					}}
				>
					{entry.title}
				</div>
			</div>
		</div>
	);
}
