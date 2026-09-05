#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { deployCaddy } from '#deploy/deploy-caddy.ts';
import { verifyEdge } from '#deploy/verify-edge.ts';
import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { type: 'boolean', default: false },
	},
});

const isDryRun = values['dry-run'];

await ensureSshKeychain();

await deployCaddy({
	rootPath: findWorkspaceRoot(),
	dryRun: isDryRun,
});

if (!isDryRun) await verifyEdge();
