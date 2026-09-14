export const UrlStatusEnum = {
	Blocked: 'blocked',
	Error: 'error',
	Healthy: 'healthy',
	Missing: 'missing',
	Pending: 'pending',
	Redirect: 'redirect',
} as const satisfies Record<string, string>;

export interface UrlRow {
	check_count: number;
	created_at: string;
	id: number;
	last_http_status: null | number;
	redirect_url: null | string;
	status: UrlStatus;
	updated_at: string;
	url: string;
}

export type UrlStatus = (typeof UrlStatusEnum)[keyof typeof UrlStatusEnum];
