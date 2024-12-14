import { tailwindConfig } from '@spectralcodex/tailwind/config';

import type { OpenGraphMetadataItem } from './types';

const colors = tailwindConfig.theme.colors;

export function getOpenGraphImageElement(
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
				background: colors.primary['900'],
				display: 'flex',
				fontFamily: '"Geologica"',
				fontWeight: 500,
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
						maskImage: 'linear-gradient(to top, rgb(0, 0, 0, 0.3) 10%, black)',
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
						color: colors.highlight['200'],
						fontSize: '24px',
						padding: '0 24px',
						textShadow: `0 0 3px rgb(0, 0, 0, 0.4)`,
					}}
				>
					{entry.collection.toLocaleUpperCase()}
				</div>
				<div
					style={{
						color: colors.highlight['50'],
						display: 'block', // Necessary for line clamp
						fontSize: '72px',
						fontWeight: 700,
						lineClamp: 2,
						padding: '0 24px 16px 24px',
						textShadow: `0 0 10px rgb(0, 0, 0, 0.6)`,
					}}
				>
					{entry.title}
				</div>
			</div>
		</div>
	);
}
