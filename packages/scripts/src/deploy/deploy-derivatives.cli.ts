import * as R from 'remeda';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import {
	getImageSet,
	getOpenGraphSet,
	pruneRemoteDerivatives,
	uploadDerivatives,
} from '#deploy/deploy-derivatives.ts';
import { defineCommand, Refusal, runCommand } from '#shared/cli-command.ts';
import { ensureSshKeychain } from '#shared/utils.ts';

const derivativeSets = { images: getImageSet, og: getOpenGraphSet };

await runCommand(
	defineCommand({
		interrupted: 'the server keeps every finished file, so the next run resumes',
		name: 'deploy-images|deploy-og',
		options: {
			'allow-mass-prune': {
				default: false,
				description: 'With --prune-remote, delete more than the safety limit allows',
				type: 'boolean',
			},
			'dry-run': { default: false, description: 'Show what rsync would do', type: 'boolean' },
			'prune-remote': {
				default: false,
				description: 'Delete remote files absent locally, after a typed confirmation',
				type: 'boolean',
			},
		},
		positional: { description: 'images or og; each alias passes its own', name: 'set' },
		async run({ paths, positionals, signal, values }) {
			const [requestedSet] = positionals;

			if (requestedSet === undefined || !R.isIncludedIn(requestedSet, R.keys(derivativeSets))) {
				throw new Refusal(`Expected an image set (images or og), got ${String(requestedSet)}`);
			}

			await ensureSshKeychain();

			const config = loadDeployConfig();
			const set = derivativeSets[requestedSet](paths, config);

			if (values['prune-remote']) {
				await pruneRemoteDerivatives(set, {
					config,
					dryRun: values['dry-run'],
					isMassPruneAllowed: values['allow-mass-prune'],
					signal,
				});
				return;
			}

			await uploadDerivatives(set, { config, dryRun: values['dry-run'] });
		},
		summary: 'Upload rendered images or OpenGraph images to the server, or prune remote orphans',
		title: 'Deploy images',
	}),
);
