#!/usr/bin/env tsx
import chalk from 'chalk';

import { parseContentFiles } from '../content-utils';

interface ComponentError {
	line: number;
	message: string;
	context: string;
}

function validateLinkComponents(content: string): Array<ComponentError> {
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

function validateImgComponents(content: string): Array<ComponentError> {
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
			const linkErrors = validateLinkComponents(parsedFile.content);
			const imgErrors = validateImgComponents(parsedFile.content);
			const allErrors = [...linkErrors, ...imgErrors];

			if (allErrors.length > 0) {
				console.log(chalk.red(`❌ ${parsedFile.pathRelative}`));

				for (const error of allErrors) {
					console.log(chalk.red(`   Line ${error.line.toString()}: ${error.message}`));
					console.log(chalk.gray(`   ${error.context.trim()}`));
				}

				errorCount += allErrors.length;
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
