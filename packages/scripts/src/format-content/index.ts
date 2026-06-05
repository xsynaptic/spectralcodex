#!/usr/bin/env tsx
import type { PluggableList } from 'unified';

import chalk from 'chalk';
import { mdxlint } from 'mdxlint';
import { glob, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createLinter, loadTextlintrc } from 'textlint';

import { fileExists, findWorkspaceRoot } from '../shared/utils.js';

interface MdxlintConfig {
	plugins?: PluggableList;
	settings?: Record<string, unknown>;
}

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	options: {
		fix: { type: 'boolean', default: false },
	},
	allowPositionals: true,
});

const targetDir = positionals[0];

if (!targetDir) {
	console.error(chalk.red('Usage: format-content <target-package-dir> [--fix]'));
	process.exit(1);
}

const rootPath = findWorkspaceRoot();
const targetPath = path.join(rootPath, targetDir);
const shouldFix = values.fix;

// The config lives in the target package so the VS Code mdxlint extension can resolve it and its plugins
// Importing it here resolves those plugins relative to the config's own location, not this package
const mdxlintConfigPath = path.join(targetPath, '.mdxlintrc.mjs');
const { default: mdxlintConfig } = (await import(pathToFileURL(mdxlintConfigPath).href)) as {
	default: MdxlintConfig;
};

const processor = mdxlint().data('settings', mdxlintConfig.settings);
processor.use(mdxlintConfig.plugins ?? []);

// Textlint is optional; content-demo has an mdxlint config but no textlint config
const textlintConfigPath = path.join(targetPath, '.textlintrc.json');
const linter = (await fileExists(textlintConfigPath))
	? createLinter({ descriptor: await loadTextlintrc({ configFilePath: textlintConfigPath }) })
	: undefined;

let written = 0;
let skipped = 0;
let warnings = 0;

function reportMessages(relativePath: string, messages: ReadonlyArray<{ message: string }>) {
	for (const message of messages) {
		console.warn(`${relativePath}: ${message.message}`);
		warnings++;
	}
}

for await (const match of glob('collections/**/*.mdx', { cwd: targetPath })) {
	const filePath = path.join(targetPath, match);
	const relativePath = path.relative(rootPath, filePath);
	const original = await readFile(filePath, 'utf8');

	const result = await processor.process({ value: original, path: filePath });
	reportMessages(relativePath, result.messages);

	if (!shouldFix) {
		if (linter) {
			const { messages } = await linter.lintText(original, filePath);
			reportMessages(relativePath, messages);
		}
		continue;
	}

	let formatted = String(result);

	if (linter) {
		const fixed = await linter.fixText(formatted, filePath);
		formatted = fixed.output;
		reportMessages(relativePath, fixed.messages);
	}

	// Conditional write: skip unchanged files so mtimes stay put and the dev server doesn't thrash
	if (formatted === original) {
		skipped++;
	} else {
		await writeFile(filePath, formatted);
		console.log(`${relativePath}: written`);
		written++;
	}
}

if (shouldFix) {
	console.log(
		`\n${chalk.green(String(written))} written, ${String(skipped)} unchanged, ${String(warnings)} warning(s)`,
	);
} else {
	console.log(`\n${String(warnings)} warning(s)`);
	if (warnings > 0) process.exit(1);
}
