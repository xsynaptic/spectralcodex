import { tailwindConfig } from '@spectralcodex/tailwind/config';

import type { ContentMetadataItem } from '@/types/metadata';

import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from '@/constants';
import { getImageById } from '@/lib/collections/images/utils';
import { getImageObject } from '@/lib/image/image-file-handling';
import { getOpenGraphImageDataUrl } from '@/lib/open-graph/open-graph-image-utils';

const colors = tailwindConfig.theme.colors;

export const getOpenGraphImageElement = async (entry: ContentMetadataItem) => {
	const image = entry.imageId ? await getImageById(entry.imageId) : undefined;
	const imageObject = image ? await getImageObject(image.data.src.src) : undefined;
	const imageEncoded = imageObject
		? await getOpenGraphImageDataUrl({
				imageObject,
				targetHeight: OPEN_GRAPH_IMAGE_HEIGHT,
				targetWidth: OPEN_GRAPH_IMAGE_WIDTH,
			})
		: '';

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
			{imageEncoded && imageEncoded.length > 0 ? (
				<img
					src={imageEncoded}
					height={OPEN_GRAPH_IMAGE_HEIGHT}
					width={OPEN_GRAPH_IMAGE_WIDTH}
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
};
