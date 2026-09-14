#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { deployCaddy } from '#deploy/deploy-caddy.ts';
import { verifyEdge } from '#deploy/verify-edge.ts';
import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { default: false, type: 'boolean' },
	},
});

const isDryRun = values['dry-run'];

await ensureSshKeychain();

await deployCaddy({
	dryRun: isDryRun,
	rootPath: findWorkspaceRoot(),
});

if (!isDryRun) await verifyEdge();
