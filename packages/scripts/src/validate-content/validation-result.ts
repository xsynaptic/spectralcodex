import chalk from 'chalk';

export interface EntryReference {
	collection: string;
	field: string;
	id: string;
}

export interface ReferenceIssue extends EntryReference {
	location: string;
}

export interface ValidationIssue {
	details?: Array<string>;
	message: string;
}

// `warn` findings are printed but do not fail the run
export interface ValidationResult {
	issues: Array<ValidationIssue>;
	notes?: Array<string>;
	status: 'fail' | 'pass' | 'warn';
	summary: string;
}

export function reportValidationResult({
	issues,
	notes = [],
	status,
	summary,
}: ValidationResult): void {
	const color = status === 'fail' ? chalk.red : chalk.yellow;

	// The warning glyph is narrow, so it carries its own trailing space
	const marker = status === 'fail' ? '❌' : '⚠️ ';

	const issueLines = issues.flatMap((issue) => toIssueLines(issue, marker));

	for (const line of issueLines) {
		console.log(color(line));
	}

	console.log(status === 'pass' ? chalk.green(`✓ ${summary}`) : chalk.yellow(`⚠️  ${summary}`));

	for (const note of notes) {
		console.log(chalk.dim(note));
	}
}

export function toReferenceValidationResult(
	issues: Array<ReferenceIssue>,
	summaries: { fail: string; pass: string },
) {
	return toValidationResult(
		issues.map(({ collection, field, id, location }) => ({
			message: `${location}: ${field} references "${id}", missing from "${collection}"`,
		})),
		summaries,
	);
}

export function toValidationResult(
	issues: Array<ValidationIssue>,
	summaries: { fail: string; pass: string },
): ValidationResult {
	if (issues.length === 0) return { issues: [], status: 'pass', summary: summaries.pass };

	return { issues, status: 'fail', summary: summaries.fail };
}

function toIssueLines(issue: ValidationIssue, marker: string) {
	const details = issue.details ?? [];

	return [`${marker} ${issue.message}`, ...details.map((detail) => `   ${detail}`)];
}
