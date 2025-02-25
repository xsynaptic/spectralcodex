import { createServer, Server } from 'node:http';
import sirv from 'sirv';

import type { AstroIntegration } from 'astro';

interface CacheControlOptions {
	maxAge?: number;
	immutable?: boolean;
}

interface LocalImageServerOptions {
	mediaPath: string;
	mediaBaseUrl: string;
	buildPort: number;
	cacheControl?: CacheControlOptions;
	dev?: boolean;
}

const DEFAULT_OPTIONS: Required<LocalImageServerOptions> = {
	mediaPath: 'media',
	mediaBaseUrl: '/media',
	buildPort: 4321,
	cacheControl: {
		maxAge: 31_536_000, // 1 year in seconds
		immutable: false,
	},
	dev: false,
};

export default function localImageServer(
	options?: Partial<LocalImageServerOptions>,
): AstroIntegration {
	const integrationConfig = { ...DEFAULT_OPTIONS, ...options };

	const imageRequestHandler = sirv(integrationConfig.mediaPath, {
		dev: integrationConfig.dev,
		etag: true,
		...(integrationConfig.cacheControl.maxAge === undefined
			? {}
			: { maxAge: integrationConfig.cacheControl.maxAge }),
		...(integrationConfig.cacheControl.immutable === undefined
			? {}
			: { immutable: integrationConfig.cacheControl.immutable }),
		brotli: false,
		gzip: false,
		dotfiles: false,
	});

	let server: Server | undefined = undefined;

	// This integration handles both dev mode and the build process (via `astro:build` hooks)
	return {
		name: 'local-image-server',
		hooks: {
			'astro:config:setup': ({ config, addWatchFile }) => {
				addWatchFile(new URL(integrationConfig.mediaPath, config.root));
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
