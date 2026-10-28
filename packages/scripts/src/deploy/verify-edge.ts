import { getCachePaths } from '@spectralcodex/shared/paths';
import { parseImageName } from '@xsynaptic/astro-image-pipeline/names';
import { findDistManifest, getImageCachePaths } from '@xsynaptic/astro-image-pipeline/node';
import { createStatus, formatCount, formatDuration, log } from '@xsynaptic/astro-scripts';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import * as R from 'remeda';

import type { DeployConfig } from '#deploy/deploy-config.ts';
import type { EdgeProbe } from '#deploy/verify-edge-probes.ts';
import type { ScriptPaths } from '#shared/command.ts';

import {
	describeProbe,
	getDocumentProbe,
	getEdgeProbes,
	getProbeFailure,
} from '#deploy/verify-edge-probes.ts';

// Node's fetch never times out on its own, so a hung connection would stall the deploy
const requestTimeoutMs = 10_000;

const imageSampleSize = 20;

export async function verifyEdge({
	config,
	paths,
}: {
	config: DeployConfig;
	paths: ScriptPaths;
}): Promise<void> {
	const start = Date.now();
	const token = start.toString();
	const status = createStatus('Verifying edge cache tiers');

	const documentProbe = getDocumentProbe({ config, token });
	const documentResponse = await request(documentProbe);
	const documentFailure = labelFailure(
		documentProbe,
		await getProbeFailure(documentProbe, documentResponse),
	);
	const html = documentResponse.status === 200 ? await documentResponse.text() : undefined;
	const samples = html === undefined ? undefined : await readImageSamples(paths);
	const edge = getEdgeProbes({ config, html, samples, token });
	const failures = [documentFailure, ...edge.failures, ...(await runProbes(edge.probes))].filter(
		R.isNonNullish,
	);

	status.stop();

	if (failures.length > 0) {
		for (const failure of failures) {
			log.error(failure);
		}
		throw new Error(
			`Edge verification failed: ${String(failures.length)} check(s) do not match deploy/caddy/Caddyfile or a Cloudflare rule is overriding them`,
		);
	}

	const probeCount = formatCount(edge.probes.length + 1);

	log.success(
		`Edge verified · ${probeCount} probes passed · ${formatDuration(Date.now() - start)}`,
	);
}

async function readImageSamples(paths: ScriptPaths) {
	const { imagesPath } = getCachePaths(paths.cachePath);
	const { renditionsPath } = getImageCachePaths(imagesPath);
	const manifest = await findDistManifest({ cachePath: imagesPath, distPath: paths.distPath });

	if (!manifest) return;

	const samples = R.sample(Object.keys(manifest.renditions), imageSampleSize).flatMap((name) => {
		const parsed = parseImageName(name);

		return parsed ? [{ format: parsed.format, name }] : [];
	});

	return Promise.all(
		samples.map(async ({ format, name }) => ({
			byteLength: await getFileSize(path.join(renditionsPath, name)),
			format,
			path: name,
		})),
	);
}

async function getFileSize(filePath: string) {
	try {
		const stats = await stat(filePath);

		return stats.size;
	} catch {
		return;
	}
}

async function runProbes(probes: ReadonlyArray<EdgeProbe>) {
	const failures = await Promise.all(
		probes.map(async (probe) => getProbeFailure(probe, await request(probe))),
	);

	return probes.map((probe, index) => labelFailure(probe, failures[index]));
}

function labelFailure(probe: EdgeProbe, failure: string | undefined) {
	if (failure === undefined) return;

	return `${probe.label} (${describeProbe(probe)}): ${failure}`;
}

function fetchWithTimeout(probe: EdgeProbe) {
	return fetch(probe.url, {
		method: probe.method,
		redirect: 'manual',
		signal: AbortSignal.timeout(requestTimeoutMs),
	});
}

async function request(probe: EdgeProbe) {
	try {
		return await fetchWithTimeout(probe);
	} catch (error) {
		if (!(error instanceof DOMException && error.name === 'TimeoutError')) throw error;
	}

	try {
		return await fetchWithTimeout(probe);
	} catch (error) {
		throw new Error(
			`${probe.label} (${describeProbe(probe)}): no response within ${String(requestTimeoutMs)}ms after a retry`,
			{ cause: error },
		);
	}
}
