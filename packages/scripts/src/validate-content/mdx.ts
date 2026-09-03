import type { ContentEntry } from '../shared/astro-content.js';
import type { ValidationIssue } from './validation-result';

import { toValidationResult } from './validation-result';

interface ComponentError {
	line: number;
	message: string;
	context: string;
}

function collectLinkComponentErrors(content: string): Array<ComponentError> {
	const errors: Array<ComponentError> = [];
	const lines = content.split('\n');

	const linkRegex = /<Link(?:\s+([^>]*?))?(?:>|\/?>)/g;
	const idPropRegex = /id=["']([^"']+)["']/;

	let match: RegExpExecArray | null;

	while ((match = linkRegex.exec(content)) !== null) {
		const props = match[1] || '';
		const idMatch = idPropRegex.exec(props);

		if (!idMatch?.[1]) {
			const beforeMatch = content.slice(0, match.index);
			const lineNumber = beforeMatch.split('\n').length;
			const lineContent = lines[lineNumber - 1];

			errors.push({
				line: lineNumber,
				message: 'Link component missing id prop',
				context: lineContent ?? '',
			});
		}
	}

	return errors;
}

function collectImgComponentErrors(content: string): Array<ComponentError> {
	const errors: Array<ComponentError> = [];
	const lines = content.split('\n');

	const imgRegex = /<Img(?:\s+([^>]*?))?(?:>|\/?>)/g;
	const srcPropRegex = /src=["']([^"']+)["']/;

	let match: RegExpExecArray | null;

	while ((match = imgRegex.exec(content)) !== null) {
		const props = match[1] || '';
		const srcMatch = srcPropRegex.exec(props);

		if (!srcMatch?.[1]) {
			const beforeMatch = content.slice(0, match.index);
			const lineNumber = beforeMatch.split('\n').length;
			const lineContent = lines[lineNumber - 1];

			errors.push({
				line: lineNumber,
				message: 'Img component missing src prop',
				context: lineContent ?? '',
			});
		}
	}

	return errors;
}

export function validateMdxComponents(entries: Array<ContentEntry>) {
	const issues: Array<ValidationIssue> = [];

	let errorCount = 0;

	for (const entry of entries) {
		if (!entry.body) continue;

		const errors = [
			...collectLinkComponentErrors(entry.body),
			...collectImgComponentErrors(entry.body),
		];

		if (errors.length === 0) continue;

		issues.push({
			message: entry.filePath ?? entry.id,
			details: errors.flatMap((error) => [
				`Line ${error.line.toString()}: ${error.message}`,
				error.context.trim(),
			]),
		});

		errorCount += errors.length;
	}

	return toValidationResult(issues, {
		pass: 'MDX components valid',
		fail: `Found ${errorCount.toString()} invalid component(s)`,
	});
}
