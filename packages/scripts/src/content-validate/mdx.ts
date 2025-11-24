#!/usr/bin/env tsx
import chalk from 'chalk';

import { parseContentFiles } from '../content-utils';

interface LinkError {
	line: number;
	message: string;
	context: string;
}

function validateLinkComponents(content: string): Array<LinkError> {
	const errors: Array<LinkError> = [];
	const lines = content.split('\n');

	// Regex to match Link components - make whitespace optional
	const linkRegex = /<Link(?:\s+([^>]*?))?(?:>|\/?>)/g;
	const idPropRegex = /id=["']([^"']+)["']/;

	let match: RegExpExecArray | null;

	while ((match = linkRegex.exec(content)) !== null) {
		const props = match[1] || '';

		// Check if id prop exists and is not empty
		const idMatch = idPropRegex.exec(props);

		if (!idMatch?.[1]) {
			// Find line number
			const beforeMatch = content.slice(0, match.index);
			const lineNumber = beforeMatch.split('\n').length;
			const lineContent = lines[lineNumber - 1];

			errors.push({
				line: lineNumber,
				message: 'Link component missing ID prop',
				context: lineContent ?? '',
			});
		}
	}

	return errors;
}

export async function checkMdxComponents(contentPaths: Array<string>) {
	let overallErrorCount = 0;

	for (const contentPath of contentPaths) {
		console.log(chalk.blue(`🔍 Checking MDX components in ${contentPath}`));

		const parsedFiles = await parseContentFiles(contentPath);

		if (parsedFiles.length === 0) {
			console.log(chalk.yellow(`No MDX files found in ${contentPath}`));
			continue;
		}

		let errorCount = 0;

		for (const parsedFile of parsedFiles) {
			const errors = validateLinkComponents(parsedFile.content);

			if (errors.length > 0) {
				console.log(chalk.red(`❌ ${parsedFile.pathRelative}`));

				for (const error of errors) {
					console.log(chalk.red(`   Line ${error.line.toString()}: ${error.message}`));
					console.log(chalk.gray(`   ${error.context.trim()}`));
				}

				errorCount += errors.length;
			}
		}

		if (errorCount === 0) {
			console.log(
				chalk.green(`✓ All MDX components valid! Checked: ${parsedFiles.length.toString()}`),
			);
		} else {
			console.log(chalk.yellow(`⚠️  Found ${errorCount.toString()} invalid component(s)`));
			overallErrorCount += errorCount;
		}
	}

	return overallErrorCount === 0;
}
