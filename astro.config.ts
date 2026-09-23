import { satteri } from '@astrojs/markdown-satteri';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { astroCacheDir } from '@spectralcodex/shared/constants';
import { isIndexableUrlPath, readSitemapLastmod } from '@spectralcodex/shared/sitemap';
import tailwindcss from '@tailwindcss/vite';
import buildLogger from '@xsynaptic/astro-build-logger';
import { autoImport } from '@xsynaptic/satteri-auto-import';
import { imgGroupSatteriPlugin } from '@xsynaptic/satteri-img-group';
import { trailingSlash as trailingSlashPlugin } from '@xsynaptic/satteri-trailing-slash';
import { wrapCjk } from '@xsynaptic/satteri-wrap-cjk';
import pagefind from 'astro-pagefind';
import { defineConfig, envField, fontProviders } from 'astro/config';
import { loadEnv } from 'vite';

import devInventory from '#dev/inventory/inventory-integration.ts';

const imageServerSecretPlaceholder = 'dev-secret-do-not-use-in-production';

// Vite's `loadEnv` reintroduced after having some trouble reading from `process.env` 2025Q1
const {
	BUILD_ASSETS_PATH,
	DEV_SERVER_URL = 'http://localhost:4321/',
	IMAGE_SERVER_SECRET,
	PROD_SERVER_URL,
} = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

const isProduction = process.env.NODE_ENV === 'production';

if (
	isProduction &&
	(!IMAGE_SERVER_SECRET || IMAGE_SERVER_SECRET === imageServerSecretPlaceholder)
) {
	throw new Error(
		'IMAGE_SERVER_SECRET is unset or still the dev placeholder; production builds must sign image URLs with the real secret',
	);
}

const isSsr = process.env.BUILD_OUTPUT_PATH === './dist/server';

const trailingSlash = 'always';

// Git-derived per-URL dates, written by the sitemap-lastmod deploy step before the build
// Read on first use, so loading this config never depends on a file a content script writes
let sitemapLastmodCache: ReturnType<typeof readSitemapLastmod> | undefined;

function getSitemapLastmod() {
	if (!sitemapLastmodCache) sitemapLastmodCache = readSitemapLastmod();

	return sitemapLastmodCache;
}

/**
 * @link https://astro.build/config
 */
export default defineConfig({
	build: {
		...(BUILD_ASSETS_PATH ? { assets: BUILD_ASSETS_PATH } : {}),
	},
	cacheDir: astroCacheDir,
	site: isProduction && PROD_SERVER_URL ? PROD_SERVER_URL : DEV_SERVER_URL,
	trailingSlash: isProduction ? trailingSlash : 'ignore',
	// Still having some trouble getting this working as expected due to memory issues
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
				default: 'packages/content-demo/collections',
			}),
			CONTENT_MEDIA_PATH: envField.string({
				access: 'public',
				context: 'server',
				default: 'packages/content-demo/media',
			}),
			CUSTOM_CACHE_PATH: envField.string({
				access: 'public',
				context: 'server',
				default: './.cache',
				optional: true,
			}),
			IMAGE_SERVER_SECRET: envField.string({
				access: 'secret',
				context: 'server',
				default: imageServerSecretPlaceholder,
			}),
			IMAGE_SERVER_SIGNATURE_LENGTH: envField.number({
				access: 'public',
				context: 'server',
				default: 20,
			}),
			IMAGE_SERVER_URL: envField.string({
				access: 'secret',
				context: 'server',
				default: '/_img',
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
			weights: ['300 700'],
		},
	],
	integrations: [
		react({
			include: ['packages/react**/*'],
		}),
		mdx(),
		sitemap({
			filter: (page) => isIndexableUrlPath(new URL(page).pathname),
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
		buildLogger(),
		devInventory(),
	],
	markdown: {
		processor: satteri({
			hastPlugins: [wrapCjk({ value: 'cjk-text' }), trailingSlashPlugin({ trailingSlash })],
			mdastPlugins: [
				autoImport({
					imports: [
						{
							'./src/components/mdx/build-stats.astro': [['default', 'BuildStats']],
							'./src/components/mdx/email.astro': [['default', 'Email']],
							'./src/components/mdx/hide.astro': [['default', 'Hide']],
							'./src/components/mdx/img-group.astro': [['default', 'ImgGroup']],
							'./src/components/mdx/img.astro': [['default', 'Img']],
							'./src/components/mdx/link.astro': [['default', 'Link']],
							'./src/components/mdx/locations-table.astro': [['default', 'LocationsTable']],
							'./src/components/mdx/map.astro': [['default', 'Map']],
							'./src/components/mdx/more.astro': [['default', 'More']],
							'./src/components/mdx/resource.astro': [['default', 'Resource']],
						},
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
	vite: {
		build: {
			assetsInlineLimit: 1024,
			rollupOptions: {
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
			include: [
				'@turf/center',
				'@turf/centroid',
				'@turf/distance',
				'@turf/helpers',
				'@turf/truncate',
			],
		},
		plugins: [tailwindcss()],
		server: {
			proxy: {
				'/_img': {
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/_img/, ''),
					target: 'http://localhost:3100',
				},
			},
			watch: {
				ignored: ['./*.md'],
			},
		},
	},
});
