// @ts-check
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@spectralcodex/astro-sitemap';
import remarkImgGroup from '@spectralcodex/remark-img-group';
import tailwindcss from '@tailwindcss/vite';
import buildLogger from '@xsynaptic/astro-build-logger';
import { rehypeWrapCjk } from '@xsynaptic/rehype-wrap-cjk';
import { remarkAutoImport } from '@xsynaptic/remark-auto-import';
import pagefind from 'astro-pagefind';
import { defineConfig, envField, fontProviders } from 'astro/config';
import { loadEnv } from 'vite';

// Vite's `loadEnv` reintroduced after having some trouble reading from `process.env` 2025Q1
const {
	DEV_SERVER_URL = 'http://localhost:4321/',
	PROD_SERVER_URL,
	BUILD_ASSETS_PATH,
} = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

const isProduction = process.env.NODE_ENV === 'production';
const isSsr = process.env.BUILD_OUTPUT_PATH === './dist/server';

/**
 * @link https://astro.build/config
 */
export default defineConfig({
	site: isProduction && PROD_SERVER_URL ? PROD_SERVER_URL : DEV_SERVER_URL,
	build: {
		...(BUILD_ASSETS_PATH ? { assets: BUILD_ASSETS_PATH } : {}),
	},
	// Use .astro for data-store (matching dev server behavior)
	cacheDir: './.astro',
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
				default: 'dev-secret-do-not-use-in-production',
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
				'@turf/buffer',
				'@turf/center',
				'@turf/centroid',
				'@turf/distance',
				'@turf/helpers',
				'@turf/truncate',
			],
		},
		// Required since Astro 6.3; the prerender chunks runtime-import @keyv/sqlite which must be externalized
		ssr: {
			external: ['@keyv/sqlite', 'sqlite3', 'bindings'],
		},
	},
	markdown: {
		processor: unified({
			remarkPlugins: [
				remarkImgGroup,
				remarkAutoImport({
					imports: [
						{
							'./src/components/mdx/img.astro': [['default', 'Img']],
							'./src/components/mdx/img-group.astro': [['default', 'ImgGroup']],
							'./src/components/mdx/email.astro': [['default', 'Email']],
							'./src/components/mdx/hide.astro': [['default', 'Hide']],
							'./src/components/mdx/locations-table.astro': [['default', 'LocationsTable']],
							'./src/components/mdx/link.astro': [['default', 'Link']],
							'./src/components/mdx/map.astro': [['default', 'Map']],
							'./src/components/mdx/more.astro': [['default', 'More']],
						},
					],
				}),
			],
			rehypePlugins: [[rehypeWrapCjk, { attribute: 'class', value: 'cjk' }]],
		}),
	},
	integrations: [
		react({
			include: ['packages/react**/*'],
		}),
		mdx({
			optimize: true,
		}),
		sitemap({
			excludePrefixes: ['/objectives', '/planning', '/taiwan-theater-project', '/archives'],
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
