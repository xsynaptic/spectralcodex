import chalk from 'chalk';

import type { UrlByContentRow } from '#check-links/db.ts';
import type { UrlStatus } from '#check-links/types.ts';

import { getStats, getUrlsByStatusGroupedByContent } from '#check-links/db.ts';
import { UrlStatusEnum } from '#check-links/types.ts';
import { log } from '#shared/cli-output.ts';

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
	const { blocked, error, healthy, missing, pending, redirect, total } = getStats();

	log.data(chalk.magenta('Link check status'));
	log.data(`  Total URLs:  ${String(total)}`);
	log.data(`  Healthy:     ${chalk.green(String(healthy))}`);
	log.data(`  Redirected:  ${chalk.yellow(String(redirect))}`);
	log.data(`  Missing:     ${chalk.magenta(String(missing))}`);
	log.data(`  Blocked:     ${chalk.cyan(String(blocked))}`);
	log.data(`  Error:       ${chalk.red(String(error))}`);
	log.data(`  Pending:     ${chalk.gray(String(pending))}`);
}

function entryId(contentId: string): string {
	const slash = contentId.indexOf('/');

	if (slash === -1) return contentId;

	return contentId.slice(slash + 1);
}

function printSection({ color, formatUrl, label, status }: ReportSection): void {
	const grouped = getUrlsByStatusGroupedByContent(status);

	if (grouped.size === 0) return;

	log.data('');
	log.data(color(`--- ${label} (${String(grouped.size)} entries) ---`));

	for (const [contentId, rows] of grouped) {
		log.data(`  ${entryId(contentId)}:`);

		for (const row of rows) {
			log.data(`    - ${formatUrl(row)}`);
		}
	}
}
