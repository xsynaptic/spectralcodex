import type { PurgeRequestBody } from '#shared/purge-queue.ts';

import { requireEnv } from '#deploy/deploy-config.ts';

const requestTimeoutMs = 30_000;

interface CloudflarePurgeResult {
	errors?: Array<{ message: string }>;
	success: boolean;
}

async function readPurgeResult(response: Response): Promise<CloudflarePurgeResult> {
	try {
		return (await response.json()) as CloudflarePurgeResult;
	} catch {
		return { errors: [{ message: 'unparseable response' }], success: false };
	}
}

export async function requestCloudflarePurge(body: PurgeRequestBody) {
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/zones/${requireEnv('CLOUDFLARE_ZONE_ID')}/purge_cache`,
		{
			body: JSON.stringify(body),
			headers: {
				Authorization: `Bearer ${requireEnv('CLOUDFLARE_API_TOKEN')}`,
				'Content-Type': 'application/json',
			},
			method: 'POST',
			signal: AbortSignal.timeout(requestTimeoutMs),
		},
	);
	const result = await readPurgeResult(response);

	if (response.ok && result.success) return;

	const messages = (result.errors ?? []).map((error) => error.message).join(', ');

	throw new Error(`Cloudflare purge failed (${String(response.status)}): ${messages}`);
}
