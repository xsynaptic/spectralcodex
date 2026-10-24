// Minimum dimensions recommended by Facebook (1.91:1 aspect ratio)
export const openGraphImageWidth = 1200;
export const openGraphImageHeight = 630;
export const openGraphImageFormat = 'jpg';

export const openGraphBasePath = 'og';
export const openGraphOutputPath = '.cache/og-image';
export const openGraphStatePath = '.cache/og-image-state';

// The app emits this stem in `og:image` and the generator resolves cards back from it
export function getOpenGraphId(id: string): string {
	return id.replaceAll('/', '-');
}

export function getOpenGraphPath(id: string): string {
	return `${openGraphBasePath}/${getOpenGraphId(id)}.${openGraphImageFormat}`;
}
