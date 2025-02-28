import { z } from 'astro/zod';
import { createResolver, defineIntegration, watchDirectory } from 'astro-integration-kit';
import { createServer, Server } from 'node:http';
import sirv from 'sirv';

import type { RequestHandler } from 'sirv';

export default defineIntegration({
	name: 'local-image-server',
	optionsSchema: z.object({
		/**
		 * The path to the directory containing the images relative to the project root.
		 *
		 * @default `media`
		 */
		mediaPath: z.string().default('media'),
		/**
		 * The base URL images are served from
		 *
		 * @default `/media`
		 */
		mediaBaseUrl: z.string().default('/media'),
		/**
		 * The port to run the local image server on
		 *
		 * @default `4321`
		 */
		buildPort: z.number().optional().default(4321),
		maxAge: z.number().optional().default(31_536_000),
		immutable: z.boolean().optional().default(false),
	}),
	setup({ options }) {
		let imageRequestHandler: RequestHandler;
		let server: Server | undefined;

		// This integration handles both dev mode and the build process (via `astro:build` hooks)
		return {
			hooks: {
				'astro:config:setup': (params) => {
					const { resolve } = createResolver(params.config.root.pathname);

					imageRequestHandler = sirv(options.mediaPath, {
						dev: params.command === 'dev',
						etag: true,
						maxAge: options.maxAge,
						immutable: options.immutable,
						brotli: false,
						gzip: false,
						dotfiles: false,
					});

					params.updateConfig({
						image: {
							remotePatterns: [
								{
									protocol: 'http',
									hostname: 'localhost',
								},
							],
						},
					});

					watchDirectory(params, resolve(options.mediaPath));
				},
				'astro:server:setup': ({ server, logger }) => {
					logger.info(
						`Serving local images from "${options.mediaPath}" at "${options.mediaBaseUrl}"`,
					);

					server.middlewares.use((req, res, next) => {
						if (req.url?.startsWith(options.mediaBaseUrl)) {
							req.url = req.url.replace(options.mediaBaseUrl, '');
							imageRequestHandler(req, res, next);
						} else {
							next();
						}
					});
				},
				'astro:build:start': ({ logger }) => {
					server = createServer((req, res) => {
						if (req.url?.startsWith(options.mediaBaseUrl)) {
							req.url = req.url.replace(options.mediaBaseUrl, '');
							imageRequestHandler(req, res);
						}
					});
					server.listen(options.buildPort, () => {
						logger.info(
							`Local image server running at "http://localhost:${String(options.buildPort)}"`,
						);
					});
				},
				'astro:build:done': ({ logger }) => {
					if (server) {
						server.close();
						logger.info('Static image server stopped.');
					}
				},
			},
		};
	},
});
