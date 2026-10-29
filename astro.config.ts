import { satteri } from '@astrojs/markdown-satteri';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { astroCacheDir } from '@spectralcodex/shared/constants';
import { imageQualityByFormat } from '@spectralcodex/shared/images';
import { getUrlPathIndexing } from '@spectralcodex/shared/indexing';
import {
	contentDataPathDefault,
	contentMediaPathDefault,
	customCachePathDefault,
	getCachePaths,
} from '@spectralcodex/shared/paths';
import { siteBasePath } from '@spectralcodex/shared/routing';
import { readSitemapLastmod } from '@spectralcodex/shared/sitemap';
import tailwindcss from '@tailwindcss/vite';
import buildLogger from '@xsynaptic/astro-build-logger';
import imagePipeline from '@xsynaptic/astro-image-pipeline';
import { autoImport } from '@xsynaptic/satteri-auto-import';
import { imgGroupSatteriPlugin } from '@xsynaptic/satteri-img-group';
import { trailingSlash as trailingSlashPlugin } from '@xsynaptic/satteri-trailing-slash';
import { wrapCjk } from '@xsynaptic/satteri-wrap-cjk';
import compressor from 'astro-compressor';
import pagefind from 'astro-pagefind';
import { defineConfig, envField, fontProviders } from 'astro/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

import { mdxComponentFiles } from '#constants.ts';
import devInventory from '#dev/inventory/inventory-integration.ts';
import atlas from '#lib/atlas/atlas-integration.ts';

const imageBaseUrlDefault = '/_img';

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
const { BUILD_ASSETS_PATH, DEV_SERVER_URL = 'http://localhost:4321/', PROD_SERVER_URL } = env;

// `astro:env` reads an empty value as unset, so these must too or the integrations and pages disagree
const CONTENT_MEDIA_PATH = env.CONTENT_MEDIA_PATH || contentMediaPathDefault;
const CUSTOM_CACHE_PATH = env.CUSTOM_CACHE_PATH || customCachePathDefault;
const IMAGE_BASE_URL = env.IMAGE_BASE_URL || imageBaseUrlDefault;

const isProduction = process.env.NODE_ENV === 'production';

const isSsr = process.env.BUILD_OUTPUT_PATH === './dist/server';

const trailingSlash = 'always';

const outDirPath = fileURLToPath(new URL('dist/', import.meta.url));
const assetsPath = BUILD_ASSETS_PATH ?? '_astro';

function isPrecompressed(filePath: string) {
	const distFilePath = path.relative(outDirPath, filePath);

	if (/^api\/map\/[^/]+\.json$/.test(distFilePath)) return true;

	return distFilePath.startsWith(`${assetsPath}/`) && /\.(?:css|js)$/.test(distFilePath);
}

// Read on first use, so loading this config never depends on a file a content script writes
let sitemapLastmodCache: ReturnType<typeof readSitemapLastmod> | undefined;

function getSitemapLastmod() {
	if (!sitemapLastmodCache)
		sitemapLastmodCache = readSitemapLastmod(getCachePaths(CUSTOM_CACHE_PATH).sitemapLastmodPath);

	return sitemapLastmodCache;
}

export default defineConfig({
	base: siteBasePath,
	build: {
		...(BUILD_ASSETS_PATH ? { assets: BUILD_ASSETS_PATH } : {}),
	},
	cacheDir: astroCacheDir,
	site: isProduction && PROD_SERVER_URL ? PROD_SERVER_URL : DEV_SERVER_URL,
	trailingSlash: isProduction ? trailingSlash : 'ignore',
	...(isSsr
		? {
				adapter: node({
					mode: 'standalone',
				}),
			}
		: {}),
	env: {
		schema: {
			CONTENT_DATA_PATH: envField.string({
				access: 'public',
				context: 'server',
				default: contentDataPathDefault,
			}),
			CONTENT_MEDIA_PATH: envField.string({
				access: 'public',
				context: 'server',
				default: contentMediaPathDefault,
			}),
			CUSTOM_CACHE_PATH: envField.string({
				access: 'public',
				context: 'server',
				default: customCachePathDefault,
				optional: true,
			}),
			IMAGE_BASE_URL: envField.string({
				access: 'public',
				context: 'server',
				default: imageBaseUrlDefault,
			}),
			MAP_PROTOMAPS_API_KEY: envField.string({
				access: 'public',
				context: 'client',
				optional: true,
			}),
			UMAMI_DOMAIN: envField.string({ access: 'public', context: 'client', optional: true }),
			UMAMI_ID: envField.string({ access: 'public', context: 'client', optional: true }),
			WEBMENTION_API_KEY: envField.string({
				access: 'secret',
				context: 'server',
				optional: true,
			}),
			WEBMENTION_DOMAIN: envField.string({
				access: 'public',
				context: 'client',
				optional: true,
			}),
			WEBMENTIONS_SHOW: envField.boolean({
				access: 'public',
				context: 'server',
				default: false,
			}),
		},
	},
	experimental: {
		contentIntellisense: true,
	},
	fonts: [
		{
			cssVariable: '--font-commissioner',
			fallbacks: [],
			name: 'Commissioner',
			optimizedFallbacks: false,
			provider: fontProviders.google(),
			styles: ['normal'],
			subsets: ['latin', 'vietnamese'],
			weights: ['300 700'],
		},
		{
			cssVariable: '--font-geologica',
			fallbacks: [],
			name: 'Geologica',
			optimizedFallbacks: false,
			provider: fontProviders.google(),
			styles: ['normal'],
			subsets: ['latin', 'vietnamese'],
			weights: ['300 700'],
		},
		{
			cssVariable: '--font-lora',
			fallbacks: [],
			name: 'Lora',
			optimizedFallbacks: false,
			provider: fontProviders.fontsource(),
			styles: ['normal', 'italic'],
			subsets: ['latin', 'vietnamese'],
			weights: ['400 700'],
		},
	],
	integrations: [
		react({
			include: ['**/packages/react-*/**/*.{ts,tsx}', '@spectralcodex/react-*'],
		}),
		mdx(),
		sitemap({
			filter: (page) => getUrlPathIndexing(new URL(page).pathname).index,
			serialize: (item) => {
				const sitemapLastmod = getSitemapLastmod();

				return {
					...item,
					lastmod: sitemapLastmod.urls[item.url] ?? sitemapLastmod.generatedAt,
				};
			},
		}),
		pagefind({
			indexConfig: {
				excludeSelectors: [
					"[id='footnote-label']",
					"[id^='user-content-fnref']",
					'[data-footnote-backref]',
				],
			},
		}),
		atlas(),
		imagePipeline({
			baseUrl: IMAGE_BASE_URL,
			cachePath: getCachePaths(CUSTOM_CACHE_PATH).imagesPath,
			encoding: {
				jpg: { quality: imageQualityByFormat.jpg },
				webp: { quality: imageQualityByFormat.webp },
			},
			mediaPath: CONTENT_MEDIA_PATH,
			placeholders: { pixels: 250, quality: 10, saturation: 1.2 },
		}),
		compressor({
			gzip: false,
			hooks: { fileFilter: ({ filePath }) => isPrecompressed(filePath) },
			zstd: false,
		}),
		buildLogger(),
		devInventory(),
	],
	markdown: {
		processor: satteri({
			hastPlugins: [wrapCjk({ value: 'cjk-text' }), trailingSlashPlugin({ trailingSlash })],
			mdastPlugins: [
				autoImport({
					imports: [
						Object.fromEntries(
							Object.entries(mdxComponentFiles).map(([name, file]) => [
								`./src/components/mdx/${file}.astro`,
								[['default', name]],
							]),
						),
					],
				}),
				imgGroupSatteriPlugin({
					contexts: {
						carousel: { disallowedAttributes: ['columns'], minImages: 2 },
						grid: {},
					},
					defaultContext: 'grid',
					layouts: ['default', 'wide', 'full'],
				}),
			],
		}),
	},
	prefetch: { prefetchAll: true },
	vite: {
		build: {
			// Inlines only the smallest client scripts; anything larger stays a separate file for cache granularity
			assetsInlineLimit: 1024,
			rolldownOptions: {
				output: {
					chunkFileNames: 'js/c-[hash].js',
					entryFileNames: 'js/a-[hash].js',
				},
			},
		},
		css: {
			lightningcss: {
				// MapLibre's logo control never mounts and its data-URI rules are half of maplibre-gl.css
				unusedSymbols: ['maplibregl-ctrl-logo'],
			},
		},
		define: {
			'import.meta.env.BUILD_VERSION': JSON.stringify(Date.now().toString()),
		},
		optimizeDeps: {
			include: ['@turf/centroid', '@turf/distance', '@turf/helpers'],
		},
		plugins: [tailwindcss()],
		server: {
			watch: {
				ignored: ['./*.md', '**/temp/**'],
			},
		},
	},
});
