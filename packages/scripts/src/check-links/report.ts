import chalk from 'chalk';

import type { UrlByContentRow } from '#check-links/db.ts';
import type { UrlStatus } from '#check-links/types.ts';

import { getStats, getUrlsByStatusGroupedByContent } from '#check-links/db.ts';
import { UrlStatusEnum } from '#check-links/types.ts';

interface ReportSection {
	status: UrlStatus;
	label: string;
	color: (text: string) => string;
	formatUrl: (row: UrlByContentRow) => string;
}

const reportSections: Array<ReportSection> = [
	{
		status: UrlStatusEnum.Redirect,
		label: 'Redirected',
		color: chalk.yellow,
		formatUrl: (row) => `${row.url} -> ${row.redirect_url ?? 'unknown'}`,
	},
	{
		status: UrlStatusEnum.Missing,
		label: 'Missing',
		color: chalk.magenta,
		formatUrl: (row) => `${row.url} ${chalk.gray(`[${String(row.check_count)}x]`)}`,
	},
	{
		status: UrlStatusEnum.Blocked,
		label: 'Blocked; needs manual verification',
		color: chalk.cyan,
		formatUrl: (row) =>
			`${row.url} ${chalk.gray(`[HTTP ${String(row.last_http_status ?? '?')}, ${String(row.check_count)}x]`)}`,
	},
	{
		status: UrlStatusEnum.Error,
		label: 'Error',
		color: chalk.red,
		formatUrl: (row) => row.url,
	},
];

function entryId(contentId: string): string {
	// content_id is "collection/entry-id", we only need the entry ID
	const slash = contentId.indexOf('/');

	if (slash === -1) return contentId;

	return contentId.slice(slash + 1);
}

function printSection({ status, label, color, formatUrl }: ReportSection): void {
	const grouped = getUrlsByStatusGroupedByContent(status);

	if (grouped.size === 0) return;

	console.log('');
	console.log(color(`--- ${label} (${String(grouped.size)} entries) ---`));

	for (const [contentId, rows] of grouped) {
		console.log(`  ${entryId(contentId)}:`);

		for (const row of rows) {
			console.log(`    - ${formatUrl(row)}`);
		}
	}
}

export function printStatus(): void {
	const { total, healthy, redirect, missing, blocked, error, pending } = getStats();

	console.log('');
	console.log(chalk.magenta('=== Link Check Status ==='));
	console.log('');
	console.log(`  Total URLs:  ${String(total)}`);
	console.log(`  Healthy:     ${chalk.green(String(healthy))}`);
	console.log(`  Redirected:  ${chalk.yellow(String(redirect))}`);
	console.log(`  Missing:     ${chalk.magenta(String(missing))}`);
	console.log(`  Blocked:     ${chalk.cyan(String(blocked))}`);
	console.log(`  Error:       ${chalk.red(String(error))}`);
	console.log(`  Pending:     ${chalk.gray(String(pending))}`);
	console.log('');
}

export function printList(filter?: string): void {
	const filterSet = filter ? new Set(filter.split(',')) : undefined;

	for (const section of reportSections) {
		if (filterSet && !filterSet.has(section.status)) continue;

		printSection(section);
	}

	console.log('');
}

export function printSessionSummary(checked: number, healthy: number, issues: number): void {
	console.log('');
	console.log(
		chalk.blue(
			`Session: ${String(checked)} checked, ${chalk.green(`${String(healthy)} healthy`)}, ${chalk.red(`${String(issues)} issues`)}`,
		),
	);
}
