#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { ensureSshKeychain, findWorkspaceRoot } from '../shared/utils.js';
import { deployCaddy } from './deploy-caddy.js';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { type: 'boolean', default: false },
	},
});

await ensureSshKeychain();

await deployCaddy({
	rootPath: findWorkspaceRoot(),
	dryRun: values['dry-run'],
});
