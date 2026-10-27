import { log } from '@xsynaptic/astro-scripts';
import chalk from 'chalk';

import type { LinkCheckStats, UrlByContentRow } from '#check-links/db.ts';
import type { UrlStatus } from '#check-links/types.ts';

import { getStats, getUrlsByStatusGroupedByContent } from '#check-links/db.ts';
import { UrlStatusEnum } from '#check-links/types.ts';

interface ReportSection {
	color: (text: string) => string;
	formatUrl: (row: UrlByContentRow) => string;
	label: string;
	status: UrlStatus;
}

const reportSections: Array<ReportSection> = [
	{
		color: chalk.yellow,
		formatUrl: (row) => `${row.url} -> ${row.redirect_url ?? 'unknown'}`,
		label: 'Redirected',
		status: UrlStatusEnum.Redirect,
	},
	{
		color: chalk.magenta,
		formatUrl: (row) => `${row.url} ${chalk.gray(`[${String(row.check_count)}x]`)}`,
		label: 'Missing',
		status: UrlStatusEnum.Missing,
	},
	{
		color: chalk.cyan,
		formatUrl: (row) =>
			`${row.url} ${chalk.gray(`[HTTP ${String(row.last_http_status ?? '?')}, ${String(row.check_count)}x]`)}`,
		label: 'Blocked; needs manual verification',
		status: UrlStatusEnum.Blocked,
	},
	{
		color: chalk.red,
		formatUrl: (row) => row.url,
		label: 'Error',
		status: UrlStatusEnum.Error,
	},
];

export function printList(filter?: string): void {
	const filterSet = filter ? new Set(filter.split(',')) : undefined;

	for (const section of reportSections) {
		if (filterSet && !filterSet.has(section.status)) continue;

		printSection(section);
	}
}

export function printSessionSummary(checked: number, healthy: number, issues: number): void {
	log.summary([
		['Checked', checked],
		['Healthy', healthy],
		['Issues', issues],
	]);
}

export function printStatus(): void {
	log.data(getStats(), formatStatus);
}

function entryId(contentId: string): string {
	const slash = contentId.indexOf('/');

	if (slash === -1) return contentId;

	return contentId.slice(slash + 1);
}

function formatSection(
	{ color, formatUrl, label }: ReportSection,
	entries: Record<string, Array<UrlByContentRow>>,
): string {
	const lines = ['', color(`--- ${label} (${String(Object.keys(entries).length)} entries) ---`)];

	for (const [contentId, rows] of Object.entries(entries)) {
		lines.push(`  ${entryId(contentId)}:`);

		for (const row of rows) {
			lines.push(`    - ${formatUrl(row)}`);
		}
	}

	return lines.join('\n');
}

function formatStatus({
	blocked,
	error,
	healthy,
	missing,
	pending,
	redirect,
	total,
}: LinkCheckStats): string {
	return [
		chalk.magenta('Link check status'),
		`  Total URLs:  ${String(total)}`,
		`  Healthy:     ${chalk.green(String(healthy))}`,
		`  Redirected:  ${chalk.yellow(String(redirect))}`,
		`  Missing:     ${chalk.magenta(String(missing))}`,
		`  Blocked:     ${chalk.cyan(String(blocked))}`,
		`  Error:       ${chalk.red(String(error))}`,
		`  Pending:     ${chalk.gray(String(pending))}`,
	].join('\n');
}

function printSection(section: ReportSection): void {
	const grouped = getUrlsByStatusGroupedByContent(section.status);

	if (grouped.size === 0) return;

	log.data({ entries: Object.fromEntries(grouped), status: section.status }, ({ entries }) =>
		formatSection(section, entries),
	);
}
