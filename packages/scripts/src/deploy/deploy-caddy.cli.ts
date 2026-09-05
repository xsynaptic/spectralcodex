#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

import { deployCaddy } from './deploy-caddy.ts';
import { verifyEdge } from './verify-edge.ts';

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
