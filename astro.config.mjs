// @ts-check
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { defineConfig, envField } from 'astro/config';
import AutoImport from 'astro-auto-import';
import { nanoid } from 'nanoid';
import rehypeWrapCjk from 'rehype-wrap-cjk';
import { loadEnv } from 'vite';

const isProduction = process.env.NODE_ENV === 'production';

const {
	DEV_SERVER_URL = 'http://localhost:4321/',
	PROD_SERVER_URL,
	BASE_PATH: BASE_PATH_PROD,
	BUILD_ASSETS_PATH,
	PROD_ASSETS_URL,
} = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

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
	/* TODO: implement SSR
	adapter: node({
		mode: 'standalone',
	}),
	*/
	env: {
		schema: {
			BUILD_OUTPUT_PATH: envField.string({
				context: 'server',
				access: 'secret',
				// This should match `outDir` and may need `server` added when using the Node adapter
				default: './dist',
			}),
			COLLECTIONS_PATH: envField.string({
				context: 'server',
				access: 'public',
				default: './packages/content-demo/collections',
			}),
			MEDIA_PATH: envField.string({
				context: 'server',
				access: 'public',
				default: './packages/content-demo/media',
			}),
			SITE_YEAR_FOUNDED: envField.string({
				context: 'client',
				access: 'public',
				default: String(currentDate.getFullYear()),
			}),
			FEATURE_DATE_ARCHIVES: envField.boolean({
				context: 'server',
				access: 'public',
				default: false,
			}),
			FEATURE_IMAGE_PAGES: envField.boolean({
				context: 'server',
				access: 'public',
				default: false,
			}),
			FEATURE_OPEN_GRAPH_IMAGES: envField.boolean({
				context: 'server',
				access: 'public',
				default: false,
			}),
			FEATURE_SEARCH: envField.boolean({ context: 'server', access: 'public', default: false }),
			FEATURE_SHORTCODES_ERROR_LOG: envField.boolean({
				context: 'server',
				access: 'public',
				default: false,
			}),
			MAP_PROTOMAPS_API_KEY: envField.string({ context: 'client', access: 'public' }),
		},
	},
	vite: {
		define: {
			'import.meta.env.BUILD_ID': JSON.stringify(isProduction ? nanoid() : 'dev'),
		},
	},
	markdown: {
		rehypePlugins: [rehypeWrapCjk],
	},
	integrations: [
		tailwind(),
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
	],
	image: {
		service: {
			// For reference, the original entrypoint: 'astro/assets/services/sharp',
			entrypoint: '@spectralcodex/image-service',
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
				codes: ['zh', 'zh-TW', 'zh-hant'],
			},
		],
	},
	experimental: {
		contentIntellisense: true,
	},
});
