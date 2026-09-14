export const UrlStatusEnum = {
	Pending: 'pending',
	Healthy: 'healthy',
	Blocked: 'blocked',
	Redirect: 'redirect',
	Missing: 'missing',
	Error: 'error',
} as const satisfies Record<string, string>;

export type UrlStatus = (typeof UrlStatusEnum)[keyof typeof UrlStatusEnum];

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
