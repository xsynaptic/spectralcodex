import { log } from '#shared/cli-output.ts';

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
	function report(text: string) {
		if (status === 'fail') {
			log.error(text);
		} else {
			log.warn(text);
		}
	}

	for (const issue of issues) {
		const details = issue.details ?? [];

		report(issue.message);

		for (const detail of details) log.detail(detail);
	}

	if (status === 'pass') {
		log.success(summary);
	} else {
		report(summary);
	}

	for (const note of notes) log.detail(note);
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
