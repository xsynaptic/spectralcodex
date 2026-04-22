import type { AstroIntegration } from 'astro';
import type { PagefindServiceConfig } from 'pagefind';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { close, createIndex } from 'pagefind';
import sirv from 'sirv';
import { z } from 'zod';

const optionsSchema = z
	.object({
		/** Configuration passed to pagefind's `createIndex` */
		indexConfig: z.custom<PagefindServiceConfig>().optional(),
		/** Glob pattern for discovering files to index (default: `**\/*.{html}`) */
		glob: z.string().optional(),
		/** Subdirectory name for the search index output (default: `pagefind`) */
		outputSubdir: z.string().optional(),
	})
	.optional();

type Options = z.input<typeof optionsSchema>;

export default function pagefind(options?: Options): AstroIntegration {
	const parsed = optionsSchema.parse(options);
	const glob = parsed?.glob ?? '**/*.{html}';
	const outputSubdir = parsed?.outputSubdir ?? 'pagefind';
	const urlPrefix = `/${outputSubdir}/`;

	let clientDir: string | undefined;

	return {
		name: '@spectralcodex/astro-pagefind',
		hooks: {
			'astro:config:setup': ({ config, logger }) => {
				if (config.output === 'server') {
					logger.info(
						'Only prerendered pages will be indexed. Dynamic server-rendered routes are not indexable.',
					);
				}

				if (config.adapter) {
					clientDir = fileURLToPath(config.build.client);
				}
			},
			'astro:server:setup': ({ server, logger }) => {
				const outDir = clientDir ?? path.join(server.config.root, server.config.build.outDir);

				logger.debug(`Serving pagefind from ${outDir}`);

				const serve = sirv(outDir, { dev: true, etag: true });

				server.middlewares.use((req, res, next) => {
					if (req.url?.startsWith(urlPrefix)) {
						serve(req, res, next);
					} else {
						next();
					}
				});
			},
			'astro:build:done': async ({ dir, logger }) => {
				const outDir = fileURLToPath(dir);

				const { index, errors: createErrors } = await createIndex(parsed?.indexConfig);

				if (!index) {
					logger.error('Failed to create index');
					for (const error of createErrors) {
						logger.error(error);
					}
					return;
				}

				try {
					const { page_count, errors: addErrors } = await index.addDirectory({
						path: outDir,
						glob,
					});

					if (addErrors.length > 0) {
						logger.error('Failed to index files');
						for (const error of addErrors) {
							logger.error(error);
						}
						return;
					}

					logger.info(`Indexed ${String(page_count)} pages`);

					const { outputPath, errors: writeErrors } = await index.writeFiles({
						outputPath: path.join(outDir, outputSubdir),
					});

					if (writeErrors.length > 0) {
						logger.error('Failed to write index');
						for (const error of writeErrors) {
							logger.error(error);
						}
						return;
					}

					logger.info(`Wrote index to ${outputPath}`);
				} finally {
					await index.deleteIndex();
					await close();
				}
			},
		},
	};
}
