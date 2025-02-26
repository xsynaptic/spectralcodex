import { createServer, Server } from 'node:http';
import sirv, { type RequestHandler } from 'sirv';

import type { AstroIntegration } from 'astro';

interface LocalImageServerOptions {
	mediaPath: string;
	mediaBaseUrl: string;
	buildPort: number;
	maxAge: number;
	immutable: boolean;
}

const DEFAULT_OPTIONS: LocalImageServerOptions = {
	mediaPath: 'media',
	mediaBaseUrl: '/media',
	buildPort: 4321,
	maxAge: 31_536_000, // 1 year in seconds
	immutable: false,
};

export default function localImageServer(
	options?: Partial<LocalImageServerOptions>,
): AstroIntegration {
	const integrationConfig = { ...DEFAULT_OPTIONS, ...options };

	let imageRequestHandler: RequestHandler;
	let server: Server | undefined = undefined;

	// This integration handles both dev mode and the build process (via `astro:build` hooks)
	return {
		name: 'local-image-server',
		hooks: {
			'astro:config:setup': ({ command, config, addWatchFile, updateConfig }) => {
				// TODO: does not work for directories, investigate using https://astro-integration-kit.netlify.app/utilities/watch-directory/
				addWatchFile(new URL(integrationConfig.mediaPath, config.root));

				imageRequestHandler = sirv(integrationConfig.mediaPath, {
					dev: command === 'dev',
					etag: true,
					maxAge: integrationConfig.maxAge,
					immutable: integrationConfig.immutable,
					brotli: false,
					gzip: false,
					dotfiles: false,
				});

				updateConfig({
					image: {
						remotePatterns: [
							{
								protocol: 'http',
								hostname: 'localhost',
							},
						],
					},
				});
			},
			'astro:server:setup': ({ server, logger }) => {
				logger.info(
					`Serving local images from "${integrationConfig.mediaPath}" at "${integrationConfig.mediaBaseUrl}"`,
				);

				server.middlewares.use((req, res, next) => {
					if (req.url?.startsWith(integrationConfig.mediaBaseUrl)) {
						req.url = req.url.replace(integrationConfig.mediaBaseUrl, '');
						imageRequestHandler(req, res, next);
					} else {
						next();
					}
				});
			},
			'astro:build:start': ({ logger }) => {
				server = createServer((req, res) => {
					if (req.url?.startsWith(integrationConfig.mediaBaseUrl)) {
						req.url = req.url.replace(integrationConfig.mediaBaseUrl, '');
						imageRequestHandler(req, res);
					}
				});
				server.listen(integrationConfig.buildPort, () => {
					logger.info(
						`Local image server running at "http://localhost:${String(integrationConfig.buildPort)}"`,
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
}
