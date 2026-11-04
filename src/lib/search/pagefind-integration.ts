import type { AstroIntegration } from 'astro';

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createIndex } from 'pagefind';
import sirv from 'sirv';

import {
	getPackageVersion,
	pagefindBundleDir,
	pagefindBundlePath,
	pagefindVersion,
} from '#lib/search/pagefind-bundle.ts';

const excludeSelectors = [
	"[id='footnote-label']",
	"[id^='user-content-fnref']",
	'[data-footnote-backref]',
];

export default function pagefind(): AstroIntegration {
	let outDir: string;

	return {
		hooks: {
			'astro:build:done': async ({ dir, logger }) => {
				const { errors: indexErrors, index } = await createIndex({ excludeSelectors });

				if (!index) throw new Error(`Pagefind failed to create index: ${indexErrors.join(', ')}`);

				const distPath = fileURLToPath(dir);
				const { errors: indexingErrors, page_count } = await index.addDirectory({ path: distPath });

				if (indexingErrors.length > 0) {
					throw new Error(`Pagefind failed to index files: ${indexingErrors.join(', ')}`);
				}

				const { errors: writeErrors, outputPath } = await index.writeFiles({
					outputPath: path.join(distPath, pagefindBundleDir),
				});

				if (writeErrors.length > 0) {
					throw new Error(`Pagefind failed to write index: ${writeErrors.join(', ')}`);
				}

				logger.info(`Indexed ${String(page_count)} pages to ${outputPath}`);
			},
			'astro:config:setup': ({ config }) => {
				const componentUiVersion = getPackageVersion('@pagefind/component-ui');

				// The component UI reads the indexer's output format, which changes between releases
				if (componentUiVersion !== pagefindVersion) {
					throw new Error(
						`pagefind ${pagefindVersion} and @pagefind/component-ui ${componentUiVersion} must be the same version`,
					);
				}

				outDir = fileURLToPath(config.outDir);
			},
			'astro:server:setup': ({ logger, server }) => {
				if (!existsSync(path.join(outDir, pagefindBundleDir, 'pagefind.js'))) {
					logger.warn(`No ${pagefindBundleDir} in the last build; search needs a rebuild`);
				}

				const serve = sirv(outDir, { dev: true, etag: true });

				server.middlewares.use((request, response, next) => {
					if (!request.url?.startsWith(pagefindBundlePath)) {
						next();
						return;
					}

					serve(request, response, next);
				});
			},
		},
		name: 'pagefind',
	};
}
