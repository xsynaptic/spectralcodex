import { log, runChild, withStep } from '@xsynaptic/astro-scripts';

import { deployApp } from '#deploy/deploy-app.ts';
import { invokeCacheRefresh } from '#deploy/deploy-cache-refresh.ts';
import { deployCaddy } from '#deploy/deploy-caddy.ts';
import { loadDeployConfig, printDeployConfig } from '#deploy/deploy-config.ts';
import { getOpenGraphSet, getRenditionSet, uploadRenderedSet } from '#deploy/deploy-images.ts';
import { ensureSshKeychain } from '#deploy/rsync-exec.ts';
import { verifyEdge } from '#deploy/verify-edge.ts';
import { runCommand } from '#shared/command.ts';
import { generateSitemapLastmod } from '#sitemap-lastmod/index.ts';

await runCommand({
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
	async run({ paths, rootPath, signal, values }) {
		const isDryRun = values['dry-run'];
		const config = loadDeployConfig();

		printDeployConfig(config);

		await ensureSshKeychain();

		async function runRoot(text: string, args: Array<string>) {
			await runChild(text, ['pnpm', ...args], { cwd: rootPath });
		}

		async function runScript(text: string, name: string) {
			await runChild(text, ['pnpm', '--silent', '-C', 'packages/scripts', name], { cwd: rootPath });
		}

		// Content scripts read the store `astro sync` writes, so it has to run first
		async function sync() {
			await runRoot('Syncing content', ['astro', 'sync', '--mode', 'production']);
		}

		// A webmention.io outage must not block a deploy; the build falls back to the committed data
		async function webmentions() {
			if (process.env.WEBMENTIONS_SHOW !== 'true') {
				log.detail('Skipping webmentions; `WEBMENTIONS_SHOW` is off');
				return;
			}

			try {
				await runScript('Fetching webmentions', 'webmentions');
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

			await runRoot('Building', ['astro', 'build']);
		}

		async function test() {
			if (values['skip-smoke']) {
				log.warn('Skipping smoke suite');
				return;
			}

			await runRoot('Running E2E smoke tests', ['--silent', 'test-e2e-smoke', '--reporter=line']);
		}

		const steps: Array<() => Promise<void>> = [
			sync,
			() => runScript('Validating content', 'validate-content'),
			() => runScript('Generating redirects', 'generate-redirects'),
			() => runScript('Finding similar content', 'similar-content'),
			webmentions,
			() =>
				withStep('Sitemap lastmod', () =>
					generateSitemapLastmod({ paths, rootPath, siteUrl: config.siteUrl }),
				),
			build,
			() => runScript('Rendering images', 'render-images'),
			() => runScript('Rendering OpenGraph cards', 'render-opengraph'),
			test,
			() => uploadRenderedSet(getRenditionSet(paths, config), { config, dryRun: isDryRun }),
			() => uploadRenderedSet(getOpenGraphSet(paths, config), { config, dryRun: isDryRun }),
			() => deployApp({ dryRun: isDryRun, rootPath }),
			() => deployCaddy({ dryRun: isDryRun, rootPath }),
			async () => {
				if (!isDryRun) await verifyEdge({ config, paths });
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
});
