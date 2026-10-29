import { getCachePaths } from '@spectralcodex/shared/paths';
import { parseRenditionName } from '@xsynaptic/astro-image-pipeline/names';
import { findDistManifest, getImageCachePaths } from '@xsynaptic/astro-image-pipeline/node';
import { fetchWithRetry, formatCount, formatError, log, withStep } from '@xsynaptic/astro-scripts';
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

async function runEdgeProbes(paths: ScriptPaths, config: DeployConfig) {
	const token = Date.now().toString();
	const documentProbe = getDocumentProbe({ config, token });
	const documentResponse = await request(documentProbe);
	const documentFailure = labelFailure(
		documentProbe,
		getProbeFailure(documentProbe, documentResponse),
	);
	const html = documentResponse.status === 200 ? await documentResponse.text() : undefined;
	const samples = html === undefined ? undefined : await readImageSamples(paths);
	const edge = getEdgeProbes({ config, html, samples, token });
	const failures = [documentFailure, ...edge.failures, ...(await runProbes(edge.probes))].filter(
		R.isNonNullish,
	);

	if (failures.length > 0) {
		for (const failure of failures) {
			log.error(failure);
		}
		throw new Error(
			`Edge verification failed: ${String(failures.length)} check(s) do not match deploy/caddy/Caddyfile or a Cloudflare rule is overriding them`,
		);
	}

	return edge.probes.length + 1;
}

export async function verifyEdge({
	config,
	paths,
}: {
	config: DeployConfig;
	paths: ScriptPaths;
}): Promise<void> {
	await withStep(
		'Verifying edge cache tiers',
		() => runEdgeProbes(paths, config),
		(probeCount) => `Edge verified · ${formatCount(probeCount)} probes passed`,
	);
}

async function readImageSamples(paths: ScriptPaths) {
	const { imagesPath } = getCachePaths(paths.cachePath);
	const { renditionsPath } = getImageCachePaths(imagesPath);
	const manifest = await findDistManifest({ cachePath: imagesPath, distPath: paths.distPath });

	if (!manifest) return;

	const samples = R.sample(Object.keys(manifest.renditions), imageSampleSize).flatMap((name) => {
		const parsed = parseRenditionName(name);

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
	const results = await Promise.allSettled(
		probes.map(async (probe) => labelFailure(probe, getProbeFailure(probe, await request(probe)))),
	);

	return results.map((result) => {
		if (result.status === 'fulfilled') return result.value;
		if (isAbortError(result.reason)) throw result.reason;

		return formatError(result.reason);
	});
}

function isAbortError(error: unknown) {
	return error instanceof DOMException && error.name === 'AbortError';
}

function labelFailure(probe: EdgeProbe, failure: string | undefined) {
	if (failure === undefined) return;

	return `${probe.label} (${describeProbe(probe)}): ${failure}`;
}

function request(probe: EdgeProbe) {
	return fetchWithRetry(probe.url, {
		label: `${probe.label} (${describeProbe(probe)})`,
		method: probe.method,
		redirect: 'manual',
		timeoutMs: requestTimeoutMs,
	});
}
