import type { ImageManifest } from '@spectralcodex/shared/images';

import { getImageCachePaths, imageManifestFile } from '@spectralcodex/shared/images';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import * as R from 'remeda';

import type { DeployConfig } from '#deploy/deploy-config.ts';
import type { EdgeProbe } from '#deploy/verify-edge-probes.ts';

import {
	describeProbe,
	getDocumentProbe,
	getEdgeProbes,
	getProbeFailure,
} from '#deploy/verify-edge-probes.ts';
import { log } from '#shared/cli-output.ts';
import { readJsonFile } from '#shared/files.ts';

// Node's fetch never times out on its own, so a hung connection would stall the deploy
const requestTimeoutMs = 10_000;

const imageSampleSize = 20;

export async function verifyEdge({
	cachePath,
	config,
}: {
	cachePath: string;
	config: DeployConfig;
}): Promise<void> {
	const token = Date.now().toString();

	log.step('Verifying edge cache tiers...');

	const documentProbe = getDocumentProbe({ config, token });
	const documentResponse = await request(documentProbe);
	const documentFailure = reportProbe(
		documentProbe,
		await getProbeFailure(documentProbe, documentResponse),
	);
	const html = documentResponse.status === 200 ? await documentResponse.text() : undefined;
	const samples = html === undefined ? undefined : await readImageSamples(cachePath);
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

	log.success('Edge verification passed');
}

async function readImageSamples(cachePath: string) {
	const { derivativesPath, statePath } = getImageCachePaths(cachePath);
	const manifest = await readJsonFile<ImageManifest>(path.join(statePath, imageManifestFile));

	if (!manifest) return;

	return Promise.all(
		R.sample(manifest.derivatives, imageSampleSize).map(async (derivative) => ({
			byteLength: await getFileSize(path.join(derivativesPath, derivative.path)),
			format: derivative.format,
			path: derivative.path,
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

	return probes.map((probe, index) => reportProbe(probe, failures[index]));
}

function reportProbe(probe: EdgeProbe, failure: string | undefined) {
	if (failure !== undefined) return `${probe.label} (${describeProbe(probe)}): ${failure}`;

	log.detail(`ok  ${probe.label}: ${describeProbe(probe)}`);

	return;
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
