import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'zx';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { rsyncTo, sshExec } from '#deploy/rsync-exec.ts';
import { formatDuration, log } from '#shared/cli-output.ts';

interface DeployCaddyOptions {
	dryRun?: boolean;
	rootPath: string;
}

export async function deployCaddy(options: DeployCaddyOptions): Promise<void> {
	const { dryRun = false, rootPath } = options;

	const config = loadDeployConfig();

	const deployDir = path.join(rootPath, 'deploy');
	const remoteCaddyPath = `${config.remotePath}/caddy`;
	const remoteCertsPath = `${config.remotePath}/certs`;

	log.step('Deploying Caddy config...');
	log.detail(`Caddy: ${deployDir}/caddy/ → ${config.remoteHost}:${remoteCaddyPath}/`);
	log.detail(`Certs: ${deployDir}/certs/ → ${config.remoteHost}:${remoteCertsPath}/`);

	if (dryRun) log.warn('Dry run');

	const start = Date.now();

	await validateCaddyConfig(deployDir);

	// rsync ignores gitignore, so stray tooling residue would otherwise land in the Caddy config dir
	await rsyncTo(`${deployDir}/caddy/`, `${config.remoteHost}:${remoteCaddyPath}/`, {
		config,
		dryRun,
		excludes: ['node_modules', '.astro'],
	});

	await rsyncTo(`${deployDir}/certs/`, `${config.remoteHost}:${remoteCertsPath}/`, {
		config,
		dryRun,
	});

	await sshExec(config, 'docker exec caddy caddy reload --config /etc/caddy/Caddyfile', {
		dryRun,
	});

	log.success(`Caddy deployed in ${formatDuration(Date.now() - start)}`);
}

// A rejected reload keeps the old config serving, so the broken file only surfaces on the next restart
export async function validateCaddyConfig(deployDir: string): Promise<void> {
	const compose = await readFile(path.join(deployDir, 'docker-compose.yml'), 'utf8');
	const image = /^\s+image:\s*(caddy:\S+)$/m.exec(compose)?.[1];

	if (!image) throw new Error('No caddy image found in deploy/docker-compose.yml');

	log.detail(`Validating Caddyfile with ${image}`);

	await $`docker run --rm -v ${deployDir}/caddy:/etc/caddy:ro -v ${deployDir}/certs:/certs:ro ${image} caddy validate --config /etc/caddy/Caddyfile`.quiet();
}
