import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import type { DeployConfig } from '#deploy/deploy-config.ts';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { rsyncTo, sshCaptureUnchecked, sshExec } from '#deploy/rsync-exec.ts';
import { Refusal } from '#shared/cli-command.ts';
import { formatDuration, log } from '#shared/cli-output.ts';

interface DeployCaddyOptions {
	dryRun?: boolean;
	rootPath: string;
}

interface SyncCaddyConfigOptions {
	config: DeployConfig;
	deployDir: string;
	dryRun: boolean;
	image: string;
}

const caddyLogEntrySchema = z.object({ level: z.string(), msg: z.string() });

export async function deployCaddy(options: DeployCaddyOptions): Promise<void> {
	const { dryRun = false, rootPath } = options;

	const config = loadDeployConfig();
	const deployDir = path.join(rootPath, 'deploy');

	log.step('Deploying Caddy config...');

	if (dryRun) log.warn('Dry run');

	const start = Date.now();

	const image = await sshCaptureOrRefuse(
		config,
		"docker inspect -f '{{.Config.Image}}' caddy",
		'Could not read the running Caddy image',
	);

	await syncCaddyConfig({ config, deployDir, dryRun, image });

	await sshExec(config, 'docker exec caddy caddy reload --config /etc/caddy/Caddyfile', {
		dryRun,
	});

	log.success(`Caddy deployed in ${formatDuration(Date.now() - start)}`);
}

// A rejected reload keeps the old config serving, so the broken file only surfaces on the next restart
// Copy into the live dirs rather than renaming staging over them; the container's bind mounts would keep the old ones
export async function syncCaddyConfig(options: SyncCaddyConfigOptions): Promise<void> {
	const { config, deployDir, dryRun, image } = options;

	const stagingPath = `${config.remotePath}/.staging`;

	log.detail(`Staging: ${deployDir}/{caddy,certs}/ → ${config.remoteHost}:${stagingPath}/`);

	// rsync ignores gitignore, so stray tooling residue would otherwise land in the Caddy config dir
	await rsyncTo(`${deployDir}/caddy/`, `${config.remoteHost}:${stagingPath}/caddy/`, {
		config,
		excludes: ['node_modules', '.astro'],
		extraFlags: ['--mkpath', '--delete'],
	});

	await rsyncTo(`${deployDir}/certs/`, `${config.remoteHost}:${stagingPath}/certs/`, {
		config,
		extraFlags: ['--mkpath', '--delete'],
	});

	log.detail(`Validating with ${image}`);

	await sshCaptureOrRefuse(
		config,
		`docker run --rm --network none -v ${stagingPath}/caddy:/etc/caddy:ro -v ${stagingPath}/certs:/certs:ro ${image} caddy validate --config /etc/caddy/Caddyfile`,
		'Caddy rejected the config; live config unchanged',
	);

	log.detail(dryRun ? 'Live changes (dry run):' : 'Swapping into live config:');

	const swapFlags = dryRun ? '-ai --dry-run --delay-updates' : '-ai --delay-updates';

	await sshExec(
		config,
		`rsync ${swapFlags} --delete ${stagingPath}/caddy/ ${config.remotePath}/caddy/ && rsync ${swapFlags} ${stagingPath}/certs/ ${config.remotePath}/certs/`,
	);
}

export async function readComposeCaddyImage(deployDir: string): Promise<string> {
	const compose = await readFile(path.join(deployDir, 'docker-compose.yml'), 'utf8');
	const image = /^\s+image:\s*(caddy:\S+)$/m.exec(compose)?.[1];

	if (!image) throw new Error('No caddy image found in deploy/docker-compose.yml');

	return image;
}

export function extractCaddyError(stderr: string): string {
	const lines = stderr
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

	return lines.flatMap((line) => readErrorMessages(line)).join('\n');
}

function readErrorMessages(line: string): Array<string> {
	let parsed: unknown;

	try {
		parsed = JSON.parse(line);
	} catch {
		return [line];
	}

	const entry = caddyLogEntrySchema.safeParse(parsed);

	if (!entry.success) return [line];

	return entry.data.level === 'error' || entry.data.level === 'fatal' ? [entry.data.msg] : [];
}

async function sshCaptureOrRefuse(
	config: DeployConfig,
	command: string,
	failureMessage: string,
): Promise<string> {
	const result = await sshCaptureUnchecked(config, command);

	if (result.exitCode !== 0) {
		const reason =
			extractCaddyError(result.stderr) || `exited with code ${String(result.exitCode)}`;

		throw new Refusal(`${failureMessage}\n${reason}`);
	}

	return result.stdout.trim();
}
