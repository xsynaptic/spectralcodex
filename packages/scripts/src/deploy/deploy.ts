import { log } from '@xsynaptic/astro-scripts';
import { $ } from 'zx';

import { deployApp } from '#deploy/deploy-app.ts';
import { invokeCacheRefresh } from '#deploy/deploy-cache-refresh.ts';
import { deployCaddy } from '#deploy/deploy-caddy.ts';
import { loadDeployConfig, printDeployConfig } from '#deploy/deploy-config.ts';
import { getOpenGraphSet, getRenditionSet, uploadRenderedSet } from '#deploy/deploy-images.ts';
import { ensureSshKeychain } from '#deploy/rsync-exec.ts';
import { verifyEdge } from '#deploy/verify-edge.ts';
import { defineCommand, runCommand } from '#shared/command.ts';
import { generateSitemapLastmod } from '#sitemap-lastmod/index.ts';

await runCommand(
	defineCommand({
		name: 'deploy-site',
		options: {
			'dry-run': {
				default: false,
				description: 'Run every local step; rsync and ssh only report what they would do',
				type: 'boolean',
			},
			'skip-build': { default: false, description: 'Deploy the existing dist', type: 'boolean' },
			'skip-smoke': { default: false, description: 'Skip the E2E smoke suite', type: 'boolean' },
		},
		async run({ paths, signal, values }) {
			const isDryRun = values['dry-run'];
			const { rootPath } = paths;
			const config = loadDeployConfig();

			printDeployConfig(config);

			await ensureSshKeychain();

			async function runRoot(label: string, args: Array<string>) {
				log.step(label);
				await $({ cwd: rootPath, stdio: 'inherit' })`pnpm ${args}`;
			}

			async function runScript(name: string) {
				await $({ cwd: rootPath, stdio: 'inherit' })`pnpm -F @spectralcodex/scripts ${name}`;
			}

			// Content scripts read the store `astro sync` writes, so it has to run first
			async function sync() {
				await runRoot('Syncing content...', ['astro', 'sync', '--mode', 'production']);
			}

			// A webmention.io outage must not block a deploy; the build falls back to the committed data
			async function webmentions() {
				if (process.env.WEBMENTIONS_SHOW !== 'true') {
					log.detail('Skipping webmentions; `WEBMENTIONS_SHOW` is off');
					return;
				}

				try {
					await runScript('webmentions');
				} catch (error) {
					if (signal.aborted) throw error;

					log.warn('Webmention fetch failed, continuing with existing data');
				}
			}

			async function build() {
				if (values['skip-build']) {
					log.warn('Skipping build');
					return;
				}

				await runRoot('Building...', ['astro', 'build']);
			}

			async function test() {
				if (values['skip-smoke']) {
					log.warn('Skipping smoke suite');
					return;
				}

				await runRoot('Running E2E smoke tests...', [
					'--silent',
					'test-e2e-smoke',
					'--reporter=line',
				]);
			}

			const steps: Array<() => Promise<void>> = [
				sync,
				() => runScript('validate-content'),
				() => runScript('generate-redirects'),
				() => runScript('similar-content'),
				webmentions,
				async () => {
					log.step('Sitemap lastmod');
					await generateSitemapLastmod({ paths, siteUrl: config.siteUrl });
				},
				build,
				() => runScript('render-images'),
				() => runScript('og-image'),
				test,
				() => uploadRenderedSet(getRenditionSet(paths, config), { config, dryRun: isDryRun }),
				() => uploadRenderedSet(getOpenGraphSet(paths, config), { config, dryRun: isDryRun }),
				() => deployApp({ dryRun: isDryRun, rootPath }),
				() => deployCaddy({ dryRun: isDryRun, rootPath }),
				async () => {
					if (!isDryRun) await verifyEdge({ cachePath: paths.cachePath, config });
				},
				() => invokeCacheRefresh({ dryRun: isDryRun }),
			];

			for (const step of steps) {
				signal.throwIfAborted();
				await step();
			}

			log.success(isDryRun ? 'Deploy dry run complete' : 'Deploy complete');
		},
		summary: 'Prepare content, build, render images, upload, then verify and refresh caches',
		title: 'Deploy site',
	}),
);
