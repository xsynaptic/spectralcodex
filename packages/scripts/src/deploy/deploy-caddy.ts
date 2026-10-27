import { formatDuration, log, Refusal, withStatus } from '@xsynaptic/astro-scripts';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import type { DeployConfig } from '#deploy/deploy-config.ts';
import type { RsyncChange } from '#deploy/rsync-exec.ts';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import {
	formatRsyncChange,
	parseRsyncChange,
	rsyncTo,
	sshCapture,
	sshCaptureUnchecked,
} from '#deploy/rsync-exec.ts';

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

	if (dryRun) log.warn('Dry run');

	const start = Date.now();

	const image = await withStatus('Reading the running Caddy image', () =>
		sshCaptureOrRefuse(
			config,
			"docker inspect -f '{{.Config.Image}}' caddy",
			'Could not read the running Caddy image',
		),
	);

	const changes = await syncCaddyConfig({ config, deployDir, dryRun, image });

	if (!dryRun) {
		await withStatus('Reloading Caddy', () =>
			sshCaptureOrRefuse(
				config,
				'docker exec caddy caddy reload --config /etc/caddy/Caddyfile',
				'Caddy rejected the reload; the previous config keeps serving',
			),
		);
	}

	const parts = [
		dryRun ? 'Caddy config checked (dry run)' : 'Caddy config live',
		...(changes.length === 0 ? ['no changes'] : []),
		`validated with ${image}`,
		formatDuration(Date.now() - start),
	];

	log.success(parts.join(' · '));
	logCaddyChanges(changes);
}

export function logCaddyChanges(changes: ReadonlyArray<RsyncChange>) {
	for (const change of changes) log.detail(`  ${formatRsyncChange(change)}`);
}

// A rejected reload keeps the old config serving, so the broken file only surfaces on the next restart
// Copy into the live dirs rather than renaming staging over them; the container's bind mounts would keep the old ones
export async function syncCaddyConfig(
	options: SyncCaddyConfigOptions,
): Promise<Array<RsyncChange>> {
	const { config, deployDir, dryRun, image } = options;

	const stagingPath = `${config.remotePath}/.staging`;

	// rsync ignores gitignore, so stray tooling residue would otherwise land in the Caddy config dir
	await rsyncTo(`${deployDir}/caddy/`, `${config.remoteHost}:${stagingPath}/caddy/`, {
		config,
		excludes: ['node_modules', '.astro'],
		extraFlags: ['--mkpath', '--delete'],
		label: 'Staging Caddy config',
	});

	await rsyncTo(`${deployDir}/certs/`, `${config.remoteHost}:${stagingPath}/certs/`, {
		config,
		extraFlags: ['--mkpath', '--delete'],
		label: 'Staging certificates',
	});

	await withStatus(`Validating with ${image}`, () =>
		sshCaptureOrRefuse(
			config,
			`docker run --rm --network none -v ${stagingPath}/caddy:/etc/caddy:ro -v ${stagingPath}/certs:/certs:ro ${image} caddy validate --config /etc/caddy/Caddyfile`,
			'Caddy rejected the config; live config unchanged',
		),
	);

	const swapFlags = dryRun ? '-ai --dry-run --delay-updates' : '-ai --delay-updates';

	const swapOutput = await withStatus('Swapping into live config', () =>
		sshCapture(
			config,
			`rsync ${swapFlags} --delete ${stagingPath}/caddy/ ${config.remotePath}/caddy/ && rsync ${swapFlags} ${stagingPath}/certs/ ${config.remotePath}/certs/`,
		),
	);

	return swapOutput.split('\n').flatMap((line) => parseRsyncChange(line) ?? []);
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
