import type { MapInterval } from '#map-rules.ts';

export interface MapScopeRow {
	count: number;
	id: string;
	interval?: MapInterval;
	kind: 'region' | 'series' | 'theme';
	parentTitle?: string;
	title: string;
	titleMultilingual?: string;
	url: string;
}
