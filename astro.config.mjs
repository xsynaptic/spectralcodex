// @ts-check
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import buildLogger from '@spectralcodex/astro-build-logger';
import localImageServer from '@spectralcodex/local-image-server';
import remarkImgGroup from '@spectralcodex/remark-img-group';
import tailwindcss from '@tailwindcss/vite';
import AutoImport from 'astro-auto-import';
import pagefind from 'astro-pagefind';
import { defineConfig, envField, fontProviders } from 'astro/config';
import rehypeWrapCjk from 'rehype-wrap-cjk';
import { loadEnv } from 'vite';

// Vite's `loadEnv` reintroduced after having some trouble reading from `process.env` 2025Q1
const {
	CACHE_DIR = './node_modules/.astro',
	DEV_SERVER_URL = 'http://localhost:4321/',
	PROD_SERVER_URL,
	BASE_PATH_PROD,
	BUILD_ASSETS_PATH,
	CONTENT_MEDIA_BASE_URL,
	CONTENT_MEDIA_PATH,
	PROD_ASSETS_URL,
} = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

const isProduction = process.env.NODE_ENV === 'production';
const isSsr = process.env.BUILD_OUTPUT_PATH === './dist/server';

// TODO: base path handling is an overcomplicated mess
const BASE_PATH = isProduction ? BASE_PATH_PROD : '';

const currentDate = new Date();

/**
 * @link https://astro.build/config
 */
export default defineConfig({
	site:
		isProduction && PROD_SERVER_URL
			? `${PROD_SERVER_URL}${BASE_PATH ?? ''}`
			: `${DEV_SERVER_URL}${BASE_PATH ?? ''}`,
	...(BASE_PATH ? { base: `/${BASE_PATH}` } : {}),
	build: {
		...(BUILD_ASSETS_PATH ? { assets: BUILD_ASSETS_PATH } : {}),
		assetsPrefix: {
			...(PROD_ASSETS_URL
				? {
						gif: PROD_ASSETS_URL,
						jpg: PROD_ASSETS_URL,
						jpeg: PROD_ASSETS_URL,
						png: PROD_ASSETS_URL,
						webp: PROD_ASSETS_URL,
					}
				: {}),
			fallback: `/${BASE_PATH ?? ''}`, // Used by all other assets
		},
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
			MAP_ICONS_PATH: envField.string({
				context: 'client',
				access: 'public',
				optional: true,
				default: 'icons/map-icons',
			}),
			MAP_PROTOMAPS_API_KEY: envField.string({
				context: 'client',
				access: 'public',
				optional: true,
			}),
			UMAMI_DOMAIN: envField.string({ context: 'client', access: 'public', optional: true }),
			UMAMI_ID: envField.string({ context: 'client', access: 'public', optional: true }),
		},
	},
	vite: {
		define: {
			'import.meta.env.BUILD_VERSION': JSON.stringify(Date.now().toString()),
		},
		plugins: [tailwindcss()],
		server: {
			watch: {
				ignored: ['./*.md'],
			},
		},
	},
	markdown: {
		remarkPlugins: [remarkImgGroup],
		rehypePlugins: [[rehypeWrapCjk, { langCode: 'cjk' }]],
	},
	integrations: [
		buildLogger(),
		react({
			include: ['packages/react**/*'],
		}),
		// AutoImport *must* appear before the MDX integration
		AutoImport({
			imports: [
				{
					'./src/components/mdx/img.astro': [['default', 'Img']],
					'./src/components/mdx/img-group.astro': [['default', 'ImgGroup']],
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
		localImageServer({
			mediaPath: CONTENT_MEDIA_PATH,
			mediaBaseUrl: CONTENT_MEDIA_BASE_URL,
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
	image: {
		service: {
			entrypoint: './src/lib/image/image-service',
			config: {
				limitInputPixels: false,
			},
		},
	},
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
		staticImportMetaEnv: true,
		preserveScriptOrder: true, // Presumably the default in Astro 6
	},
});
