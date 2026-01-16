// @ts-check
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import buildLogger from '@spectralcodex/astro-build-logger';
import remarkImgGroup from '@spectralcodex/remark-img-group';
import tailwindcss from '@tailwindcss/vite';
import autoImport from 'astro-auto-import';
import pagefind from 'astro-pagefind';
import { defineConfig, envField, fontProviders } from 'astro/config';
import rehypeWrapCjk from 'rehype-wrap-cjk';
import { loadEnv } from 'vite';

// Vite's `loadEnv` reintroduced after having some trouble reading from `process.env` 2025Q1
const {
	CACHE_DIR = './node_modules/.astro',
	DEV_SERVER_URL = 'http://localhost:4321/',
	PROD_SERVER_URL,
	BUILD_ASSETS_PATH,
} = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

const isProduction = process.env.NODE_ENV === 'production';
const isSsr = process.env.BUILD_OUTPUT_PATH === './dist/server';

const currentDate = new Date();

/**
 * @link https://astro.build/config
 */
export default defineConfig({
	site: isProduction && PROD_SERVER_URL ? PROD_SERVER_URL : DEV_SERVER_URL,
	build: {
		...(BUILD_ASSETS_PATH ? { assets: BUILD_ASSETS_PATH } : {}),
	},
	cacheDir: CACHE_DIR,
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
			CACHE_DIR: envField.string({
				context: 'server',
				access: 'public',
				optional: true,
				default: CACHE_DIR,
			}),
			CONTENT_DATA_PATH: envField.string({
				context: 'server',
				access: 'public',
				default: 'packages/content-demo/data',
			}),
			CONTENT_MEDIA_PATH: envField.string({
				context: 'server',
				access: 'public',
				default: 'packages/content-demo/media',
			}),
			MAP_PROTOMAPS_API_KEY: envField.string({
				context: 'client',
				access: 'public',
				optional: true,
			}),
			UMAMI_DOMAIN: envField.string({ context: 'client', access: 'public', optional: true }),
			UMAMI_ID: envField.string({ context: 'client', access: 'public', optional: true }),
			IPX_SERVER_URL: envField.string({
				context: 'server',
				access: 'secret',
				default: 'http://localhost:3100',
			}),
			IPX_SERVER_SECRET: envField.string({
				context: 'server',
				access: 'secret',
				default: 'dev-secret-do-not-use-in-production',
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
		optimizeDeps: {
			// Added as a workaround for a bug in 6.0.0-alpha.2, remove it when it is fixed on main
			include: ['react-dom/client'],
		},
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
		},
	},
	markdown: {
		remarkPlugins: [remarkImgGroup],
		// @ts-expect-error Plugin type is stricter than Astro's RehypePlugin expectation
		rehypePlugins: [[rehypeWrapCjk, { langCode: 'cjk' }]],
	},
	integrations: [
		buildLogger(),
		react({
			include: ['packages/react**/*'],
		}),
		// AutoImport *must* appear before the MDX integration
		autoImport({
			imports: [
				{
					'./src/components/mdx/img.astro': [['default', 'Img']],
					'./src/components/mdx/img-group.astro': [['default', 'ImgGroup']],
					'./src/components/mdx/hide.astro': [['default', 'Hide']],
					'./src/components/mdx/locations-table.astro': [['default', 'LocationsTable']],
					'./src/components/mdx/link.astro': [['default', 'Link']],
					'./src/components/mdx/map.astro': [['default', 'Map']],
					'./src/components/mdx/more.astro': [['default', 'More']],
				},
			],
		}),
		mdx({
			optimize: true,
		}),
		sitemap({
			filter: (page) =>
				!['/_', '/objectives/', '/planning/', '/taiwan-theater-project/'].includes(page),
			serialize(item) {
				// TODO: more accurate last modified date for the sitemap
				return { ...item, lastMod: currentDate };
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
	],
	i18n: {
		defaultLocale: 'en',
		locales: [
			'en',
			{
				path: 'zh',
				codes: ['zh', 'zh-TW', 'zh-Hant'],
			},
		],
	},
	experimental: {
		// Note: fallback fonts are handled in `styles/themes/fonts.css`
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
		contentIntellisense: true,
	},
});
