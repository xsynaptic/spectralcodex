import type { UrlRow, UrlStatus } from './types.ts';

import { UrlStatusEnum } from './types.ts';

const USER_AGENT = 'SpectralCodex-LinkChecker/1.0 (+https://spectralcodex.com)';
const TIMEOUT_MS = 30_000;

const REQUEST_HEADERS: Record<string, string> = {
	'User-Agent': USER_AGENT,
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'en-US,en;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
};

// 403 = bot blocking (page likely exists but server might reject us)
// 429 = rate limited (definitely exists, we're just hitting too fast)
const BLOCKED_STATUS_CODES = new Set([403, 429]);

interface CheckResult {
	urlId: number;
	httpStatus: number | undefined;
	status: UrlStatus;
	redirectUrl: string | undefined;
	errorMessage: string | undefined;
}

/**
 * Check a single URL via HTTP. Tries HEAD first, falls back to GET on 405/403.
 * Uses manual redirect handling to capture the real 301/302 status code.
 */
export async function checkUrl(row: UrlRow): Promise<CheckResult> {
	const base = { urlId: row.id, redirectUrl: undefined, errorMessage: undefined } as const;

	try {
		let response = await fetchWithTimeout(row.url, 'HEAD');

		// Fall back to GET if HEAD is not allowed or blocked
		if (response.status === 405 || response.status === 403) {
			response = await fetchWithTimeout(row.url, 'GET');
		}

		// Redirect; capture the real status code and Location header
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			const redirectUrl = location ? new URL(location, row.url).href : undefined;

			return {
				...base,
				httpStatus: response.status,
				status: UrlStatusEnum.Redirect,
				redirectUrl,
			};
		}

		if (response.ok) {
			return { ...base, httpStatus: response.status, status: UrlStatusEnum.Healthy };
		}

		// Bot blocking; server rejects us but page likely exists
		if (BLOCKED_STATUS_CODES.has(response.status)) {
			return {
				...base,
				httpStatus: response.status,
				status: UrlStatusEnum.Blocked,
				errorMessage: `HTTP ${String(response.status)}`,
			};
		}

		// Other 4xx: actually missing (404, 410, etc.)
		if (response.status >= 400 && response.status < 500) {
			return { ...base, httpStatus: response.status, status: UrlStatusEnum.Missing };
		}

		return {
			...base,
			httpStatus: response.status,
			status: UrlStatusEnum.Error,
			errorMessage: `HTTP ${String(response.status)}`,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		return {
			...base,
			httpStatus: undefined,
			status: UrlStatusEnum.Error,
			errorMessage: message,
		};
	}
}

function fetchWithTimeout(url: string, method: string): Promise<Response> {
	return fetch(url, {
		method,
		headers: REQUEST_HEADERS,
		redirect: 'manual',
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
}
