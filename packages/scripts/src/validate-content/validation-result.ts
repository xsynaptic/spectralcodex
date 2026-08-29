import chalk from 'chalk';

export interface ValidationIssue {
	message: string;
	details?: Array<string>;
}

// `warn` findings are printed but do not fail the run
export interface ValidationResult {
	status: 'fail' | 'pass' | 'warn';
	summary: string;
	issues: Array<ValidationIssue>;
	notes?: Array<string>;
}

export function toValidationResult(
	issues: Array<ValidationIssue>,
	summaries: { pass: string; fail: string },
): ValidationResult {
	if (issues.length === 0) return { status: 'pass', summary: summaries.pass, issues: [] };

	return { status: 'fail', summary: summaries.fail, issues };
}

function toIssueLines(issue: ValidationIssue, marker: string) {
	const details = issue.details ?? [];

	return [`${marker} ${issue.message}`, ...details.map((detail) => `   ${detail}`)];
}

export function reportValidationResult({
	status,
	summary,
	issues,
	notes = [],
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
