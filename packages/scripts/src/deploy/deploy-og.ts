import { OPEN_GRAPH_BASE_PATH, OPEN_GRAPH_IMAGE_FORMAT } from '@spectralcodex/shared/constants';
import chalk from 'chalk';
import path from 'node:path';

import { loadDeployConfig } from './deploy-config.js';
import { rsyncTo } from './rsync-exec.js';

interface DeployOgOptions {
	rootPath: string;
	dryRun?: boolean;
	ids?: Array<string>;
}

export async function deployOg(options: DeployOgOptions): Promise<void> {
	const { rootPath, dryRun = false, ids = [] } = options;

	const config = loadDeployConfig();

	const ogImagePath = path.join(rootPath, '.cache/og-image');
	const remoteOgPath = `${config.sitePath}/${OPEN_GRAPH_BASE_PATH}`;

	console.log(chalk.blue('Syncing OpenGraph images...'));
	console.log(chalk.gray(`  From: ${ogImagePath}`));
	console.log(chalk.gray(`  To:   ${config.remoteHost}:${remoteOgPath}`));

	if (ids.length > 0) {
		console.log(chalk.gray(`  Files: ${String(ids.length)} specified`));
	}

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const start = Date.now();

	const sources =
		ids.length > 0
			? ids.map((id) => path.join(ogImagePath, `${id}.${OPEN_GRAPH_IMAGE_FORMAT}`))
			: [`${ogImagePath}/`];

	await rsyncTo(sources, `${config.remoteHost}:${remoteOgPath}/`, {
		config,
		dryRun,
		archive: 'av',
		extraFlags: ['--checksum'],
	});

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}
