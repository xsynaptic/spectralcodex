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
	id: number;
	url: string;
	status: UrlStatus;
	last_http_status: number | null;
	redirect_url: string | null;
	check_count: number;
	created_at: string;
	updated_at: string;
}
