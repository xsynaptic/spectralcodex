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

import inventory from './src/inventory/inventory-integration.ts';

const imageServerSecretPlaceholder = 'dev-secret-do-not-use-in-production';

// Vite's `loadEnv` reintroduced after having some trouble reading from `process.env` 2025Q1
const {
	DEV_SERVER_URL = 'http://localhost:4321/',
	PROD_SERVER_URL,
	BUILD_ASSETS_PATH,
	IMAGE_SERVER_SECRET,
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
const sitemapLastmod = readSitemapLastmod();

/**
 * @link https://astro.build/config
 */
export default defineConfig({
	site: isProduction && PROD_SERVER_URL ? PROD_SERVER_URL : DEV_SERVER_URL,
	trailingSlash,
	build: {
		...(BUILD_ASSETS_PATH ? { assets: BUILD_ASSETS_PATH } : {}),
	},
	// Astro's default; set explicitly so build-time scripts resolve the data store identically
	cacheDir: astroCacheDir,
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
				context: 'server',
				access: 'public',
				default: 'packages/content-demo/collections',
			}),
			CONTENT_MEDIA_PATH: envField.string({
				context: 'server',
				access: 'public',
				default: 'packages/content-demo/media',
			}),
			CUSTOM_CACHE_PATH: envField.string({
				context: 'server',
				access: 'public',
				optional: true,
				default: './.cache',
			}),
			MAP_PROTOMAPS_API_KEY: envField.string({
				context: 'client',
				access: 'public',
				optional: true,
			}),
			UMAMI_DOMAIN: envField.string({ context: 'client', access: 'public', optional: true }),
			UMAMI_ID: envField.string({ context: 'client', access: 'public', optional: true }),
			IMAGE_SERVER_URL: envField.string({
				context: 'server',
				access: 'secret',
				default: '/_img',
			}),
			IMAGE_SERVER_SECRET: envField.string({
				context: 'server',
				access: 'secret',
				default: imageServerSecretPlaceholder,
			}),
			IMAGE_SERVER_SIGNATURE_LENGTH: envField.number({
				context: 'server',
				access: 'public',
				default: 20,
			}),
			WEBMENTION_API_KEY: envField.string({
				context: 'server',
				access: 'secret',
				optional: true,
			}),
			WEBMENTION_DOMAIN: envField.string({
				context: 'client',
				access: 'public',
				optional: true,
			}),
			WEBMENTIONS_SHOW: envField.boolean({
				context: 'server',
				access: 'public',
				default: false,
			}),
		},
	},
	vite: {
		define: {
			'import.meta.env.BUILD_VERSION': JSON.stringify(Date.now().toString()),
		},
		plugins: [tailwindcss()],
		build: {
			rollupOptions: {
				output: {
					entryFileNames: 'js/a-[hash].js',
					chunkFileNames: 'js/c-[hash].js',
				},
			},
		},
		server: {
			watch: {
				ignored: ['./*.md'],
			},
			proxy: {
				'/_img': {
					target: 'http://localhost:3100',
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/_img/, ''),
				},
			},
		},
		optimizeDeps: {
			include: [
				'@turf/bbox',
				'@turf/center',
				'@turf/centroid',
				'@turf/distance',
				'@turf/helpers',
				'@turf/truncate',
			],
		},
	},
	markdown: {
		processor: satteri({
			mdastPlugins: [
				autoImport({
					imports: [
						{
							'./src/components/mdx/build-stats.astro': [['default', 'BuildStats']],
							'./src/components/mdx/email.astro': [['default', 'Email']],
							'./src/components/mdx/hide.astro': [['default', 'Hide']],
							'./src/components/mdx/img.astro': [['default', 'Img']],
							'./src/components/mdx/img-group.astro': [['default', 'ImgGroup']],
							'./src/components/mdx/locations-table.astro': [['default', 'LocationsTable']],
							'./src/components/mdx/link.astro': [['default', 'Link']],
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
			hastPlugins: [wrapCjk({ value: 'cjk' }), trailingSlashPlugin({ trailingSlash })],
		}),
	},
	integrations: [
		react({
			include: ['packages/react**/*'],
		}),
		mdx(),
		sitemap({
			filter: (page) => isIndexableUrlPath(new URL(page).pathname),
			serialize: (item) => ({
				...item,
				lastmod: sitemapLastmod.urls[item.url] ?? sitemapLastmod.generatedAt,
			}),
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
		inventory(),
	],
	fonts: [
		{
			provider: fontProviders.fontsource(),
			name: 'Commissioner',
			cssVariable: '--font-commissioner',
			weights: ['300 700'],
			styles: ['normal'],
			subsets: ['latin', 'vietnamese'],
			fallbacks: [],
			optimizedFallbacks: false,
		},
		{
			provider: fontProviders.fontsource(),
			name: 'Geologica',
			cssVariable: '--font-geologica',
			weights: ['300 700'],
			styles: ['normal'],
			subsets: ['latin', 'vietnamese'],
			fallbacks: [],
			optimizedFallbacks: false,
		},
		{
			provider: fontProviders.fontsource(),
			name: 'Lora',
			cssVariable: '--font-lora',
			weights: ['300 700'],
			styles: ['normal', 'italic'],
			subsets: ['latin', 'vietnamese'],
			fallbacks: [],
			optimizedFallbacks: false,
		},
	],
	experimental: {
		contentIntellisense: true,
	},
});
