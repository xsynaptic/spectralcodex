import type { UrlRow, UrlStatus } from './types.ts';

import { UrlStatusEnum } from './types.ts';

const userAgent = 'SpectralCodex-LinkChecker/1.0 (+https://spectralcodex.com)';
const timeoutMs = 30_000;

const requestHeaders: Record<string, string> = {
	'User-Agent': userAgent,
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'en-US,en;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
};

// 403 = bot blocking (page likely exists but server might reject us)
// 429 = rate limited (definitely exists, we're just hitting too fast)
const blockedStatusCodes = new Set([403, 429]);

// HEAD is not allowed (405) or the server blocks it (403); retry with GET
const headRetryStatusCodes = new Set([405, 403]);

interface CheckResult {
	urlId: number;
	httpStatus: number | undefined;
	status: UrlStatus;
	redirectUrl: string | undefined;
	errorMessage: string | undefined;
}

type CheckOutcome = Omit<CheckResult, 'urlId'>;

function fetchWithTimeout(url: string, method: string): Promise<Response> {
	return fetch(url, {
		method,
		headers: requestHeaders,
		redirect: 'manual',
		signal: AbortSignal.timeout(timeoutMs),
	});
}

async function fetchStatus(url: string): Promise<Response> {
	const response = await fetchWithTimeout(url, 'HEAD');

	if (!headRetryStatusCodes.has(response.status)) return response;

	void response.body?.cancel();

	return fetchWithTimeout(url, 'GET');
}

function getRedirectOutcome(response: Response, url: string): CheckOutcome {
	const location = response.headers.get('location');

	return {
		httpStatus: response.status,
		status: UrlStatusEnum.Redirect,
		redirectUrl: location ? new URL(location, url).href : undefined,
		errorMessage: undefined,
	};
}

function getOutcome(response: Response, url: string): CheckOutcome {
	if (response.status >= 300 && response.status < 400) return getRedirectOutcome(response, url);

	const base = { httpStatus: response.status, redirectUrl: undefined } as const;

	if (response.ok) return { ...base, status: UrlStatusEnum.Healthy, errorMessage: undefined };

	// Bot blocking; server rejects us but page likely exists
	if (blockedStatusCodes.has(response.status)) {
		return {
			...base,
			status: UrlStatusEnum.Blocked,
			errorMessage: `HTTP ${String(response.status)}`,
		};
	}

	// Other 4xx: actually missing (404, 410, etc.)
	if (response.status >= 400 && response.status < 500) {
		return { ...base, status: UrlStatusEnum.Missing, errorMessage: undefined };
	}

	return {
		...base,
		status: UrlStatusEnum.Error,
		errorMessage: `HTTP ${String(response.status)}`,
	};
}

// Redirects are handled manually so the real 301/302 status code survives
export async function checkUrl(row: UrlRow): Promise<CheckResult> {
	try {
		const response = await fetchStatus(row.url);

		// Status and headers are all we read; cancel the body so undici releases the connection
		void response.body?.cancel();

		return { urlId: row.id, ...getOutcome(response, row.url) };
	} catch (error) {
		return {
			urlId: row.id,
			httpStatus: undefined,
			status: UrlStatusEnum.Error,
			redirectUrl: undefined,
			errorMessage: error instanceof Error ? error.message : String(error),
		};
	}
}
