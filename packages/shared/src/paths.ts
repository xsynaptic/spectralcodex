import path from 'node:path';

export const contentDataPathDefault = 'packages/content-demo/collections';
export const contentMediaPathDefault = 'packages/content-demo/media';
export const customCachePathDefault = './.cache';

interface ContentPathsEnv {
	CONTENT_DATA_PATH?: string;
	CONTENT_MEDIA_PATH?: string;
	CUSTOM_CACHE_PATH?: string;
}

export function getCachePaths(cachePath: string) {
	return {
		checkLinksPath: path.join(cachePath, 'check-links.sqlite'),
		divisionsPath: path.join(cachePath, 'divisions'),
		imagePurgeQueuePath: path.join(cachePath, 'image-purge-queue.txt'),
		imagesPath: path.join(cachePath, 'images'),
		similarContentPath: path.join(cachePath, 'similar-content.json'),
		sitemapLastmodPath: path.join(cachePath, 'sitemap-lastmod.json'),
	};
}

export function getWebmentionsPath(contentDataPath: string) {
	return path.join(contentDataPath, '..', 'data', 'webmentions.jsonl');
}

export function resolveContentPaths(rootPath: string, env: ContentPathsEnv) {
	return {
		cachePath: path.resolve(rootPath, env.CUSTOM_CACHE_PATH || customCachePathDefault),
		contentDataPath: path.resolve(rootPath, env.CONTENT_DATA_PATH || contentDataPathDefault),
		mediaPath: path.resolve(rootPath, env.CONTENT_MEDIA_PATH || contentMediaPathDefault),
	};
}
