import { openGraphBasePath, openGraphImageFormat } from '#constants.ts';

// The app emits this stem in `og:image` and the generator resolves cards back from it
export function getOpenGraphId(id: string): string {
	return id.replaceAll('/', '-');
}

export function getOpenGraphPath(id: string): string {
	return `${openGraphBasePath}/${getOpenGraphId(id)}.${openGraphImageFormat}`;
}
