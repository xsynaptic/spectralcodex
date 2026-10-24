#!/usr/bin/env tsx
import { parseArgs } from 'node:util';
import * as R from 'remeda';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import {
	getImageSet,
	getOpenGraphSet,
	pruneRemoteDerivatives,
	uploadDerivatives,
} from '#deploy/deploy-derivatives.ts';
import { reportCliError } from '#shared/cli-error.ts';
import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

const derivativeSets = { images: getImageSet, og: getOpenGraphSet };

const { positionals, values } = parseArgs({
	allowPositionals: true,
	args: process.argv.slice(2),
	options: {
		'allow-mass-prune': { default: false, type: 'boolean' },
		'dry-run': { default: false, type: 'boolean' },
		'prune-remote': { default: false, type: 'boolean' },
	},
});

const [requestedSet] = positionals;

if (requestedSet === undefined || !R.isIncludedIn(requestedSet, R.keys(derivativeSets))) {
	throw new Error(`Expected a derivative set (images or og), got ${String(requestedSet)}`);
}

await ensureSshKeychain();

const config = loadDeployConfig();
const set = derivativeSets[requestedSet](findWorkspaceRoot(), config);
const controller = new AbortController();

process.once('SIGINT', () => {
	controller.abort();
});

try {
	await (values['prune-remote']
		? pruneRemoteDerivatives(set, {
				config,
				dryRun: values['dry-run'],
				isMassPruneAllowed: values['allow-mass-prune'],
			})
		: uploadDerivatives(set, { config, dryRun: values['dry-run'] }));
} catch (error) {
	reportCliError(
		error,
		controller.signal,
		'\nInterrupted; the server keeps every finished file, so the next run resumes',
	);
}
