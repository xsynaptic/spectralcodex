#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { ensureSshKeychain, findWorkspaceRoot } from '../shared/utils.js';
import { deployCaddy } from './deploy-caddy.js';
import { verifyEdge } from './verify-edge.js';

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
