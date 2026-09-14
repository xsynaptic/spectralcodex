import type { UrlRow, UrlStatus } from '#check-links/types.ts';

import { UrlStatusEnum } from '#check-links/types.ts';

const userAgent = 'SpectralCodex-LinkChecker/1.0 (+https://spectralcodex.com)';
const timeoutMs = 30_000;

const requestHeaders: Record<string, string> = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'en-US,en;q=0.9',
	'User-Agent': userAgent,
};

// 403 = bot blocking (page likely exists but server might reject us)
// 429 = rate limited (definitely exists, we're just hitting too fast)
const blockedStatusCodes = new Set([403, 429]);

// The server blocks HEAD (403) or does not allow it (405); retry with GET
const headRetryStatusCodes = new Set([403, 405]);

type CheckOutcome = Omit<CheckResult, 'urlId'>;

interface CheckResult {
	errorMessage: string | undefined;
	httpStatus: number | undefined;
	redirectUrl: string | undefined;
	status: UrlStatus;
	urlId: number;
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
			errorMessage: error instanceof Error ? error.message : String(error),
			httpStatus: undefined,
			redirectUrl: undefined,
			status: UrlStatusEnum.Error,
			urlId: row.id,
		};
	}
}

async function fetchStatus(url: string): Promise<Response> {
	const response = await fetchWithTimeout(url, 'HEAD');

	if (!headRetryStatusCodes.has(response.status)) return response;

	void response.body?.cancel();

	return fetchWithTimeout(url, 'GET');
}

function fetchWithTimeout(url: string, method: string): Promise<Response> {
	return fetch(url, {
		headers: requestHeaders,
		method,
		redirect: 'manual',
		signal: AbortSignal.timeout(timeoutMs),
	});
}

function getOutcome(response: Response, url: string): CheckOutcome {
	if (response.status >= 300 && response.status < 400) return getRedirectOutcome(response, url);

	const base = { httpStatus: response.status, redirectUrl: undefined } as const;

	if (response.ok) return { ...base, errorMessage: undefined, status: UrlStatusEnum.Healthy };

	// Bot blocking; server rejects us but page likely exists
	if (blockedStatusCodes.has(response.status)) {
		return {
			...base,
			errorMessage: `HTTP ${String(response.status)}`,
			status: UrlStatusEnum.Blocked,
		};
	}

	// Other 4xx: actually missing (404, 410, etc.)
	if (response.status >= 400 && response.status < 500) {
		return { ...base, errorMessage: undefined, status: UrlStatusEnum.Missing };
	}

	return {
		...base,
		errorMessage: `HTTP ${String(response.status)}`,
		status: UrlStatusEnum.Error,
	};
}

function getRedirectOutcome(response: Response, url: string): CheckOutcome {
	const location = response.headers.get('location');

	return {
		errorMessage: undefined,
		httpStatus: response.status,
		redirectUrl: location ? new URL(location, url).href : undefined,
		status: UrlStatusEnum.Redirect,
	};
}
