import type { ContentEntry } from '#shared/astro-content.ts';

import { findComponentTags, getTagProp } from '#shared/component-tags.ts';

import type { ValidationIssue } from './validation-result.ts';

import { getBodyLineOffset } from './body-line-offset.ts';
import { toValidationResult } from './validation-result.ts';

// A required prop missing here throws while the component renders, naming only the page path
const requiredProps: Record<string, string> = { Link: 'id', Img: 'src' };

const componentNames = Object.keys(requiredProps);

interface ComponentIssue {
	context: string;
	lineNumber: number;
	message: string;
}

export function collectComponentIssues(body: string): Array<ComponentIssue> {
	const lines = body.split('\n');
	const issues: Array<ComponentIssue> = [];

	for (const tag of findComponentTags(body, componentNames)) {
		const prop = requiredProps[tag.name];

		if (!prop || getTagProp(tag, prop)) continue;

		issues.push({
			context: lines[tag.lineNumber - 1]?.trim() ?? '',
			lineNumber: tag.lineNumber,
			message: `${tag.name} component missing ${prop} prop`,
		});
	}

	return issues;
}

export function validateMdxComponents(entries: Array<ContentEntry>, rootPath: string) {
	const issues: Array<ValidationIssue> = [];

	let issueCount = 0;

	for (const entry of entries) {
		if (!entry.body) continue;

		const componentIssues = collectComponentIssues(entry.body);

		if (componentIssues.length === 0) continue;

		const lineOffset = getBodyLineOffset(entry, rootPath);

		issues.push({
			message: entry.filePath ?? entry.id,
			details: componentIssues.flatMap((issue) => [
				`Line ${(issue.lineNumber + lineOffset).toString()}: ${issue.message}`,
				issue.context,
			]),
		});

		issueCount += componentIssues.length;
	}

	return toValidationResult(issues, {
		pass: 'MDX components valid',
		fail: `Found ${issueCount.toString()} invalid component(s)`,
	});
}
