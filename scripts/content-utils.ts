/* eslint-disable unicorn/no-process-exit */
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'zx';

const contentPaths = [
	'./packages/content/collections/locations',
	'./packages/content/collections/regions',
];
const verbose = process.argv.includes('--verbose');

// Output shell command results only in verbose mode
$.verbose = verbose;

async function checkSlugMismatches(): Promise<void> {
	console.log(chalk.blue('Checking for slug/filename mismatches...'));

	try {
		// Find all .mdx files recursively in specified paths
		const findResult = await $`find ${contentPaths} -name "*.mdx" -type f`;
		const files = findResult.stdout.trim().split('\n').filter(Boolean);

		if (files.length === 0) {
			console.log(chalk.yellow('No MDX files found in specified collections.'));
			return;
		}

		let mismatchCount = 0;

		for (const file of files) {
			const filename = path.basename(file, '.mdx');

			try {
				const content = await fs.readFile(file, 'utf8');

				// Extract slug from frontmatter
				const slugMatch = /^slug:\s*(.+)$/m.exec(content);
				const slug = slugMatch?.[1]?.trim();

				if (!slug) {
					console.log(chalk.red('❌ ' + file));
					console.log(chalk.red('   ERROR: No slug field found'));
					mismatchCount++;
				} else if (slug !== filename) {
					console.log(chalk.red('❌ ' + file));
					console.log(chalk.red('   Expected: ' + filename + ', Found: ' + slug));
					mismatchCount++;
				}
			} catch (error) {
				console.log(chalk.red('❌ ' + file));
				console.log(chalk.red('   ERROR: Failed to read file - ' + String(error)));
				mismatchCount++;
			}
		}

		console.log(chalk.blue('='.repeat(50)));
		console.log(chalk.blue('Total files checked: ' + files.length.toString()));
		console.log(chalk.blue('Mismatches found: ' + mismatchCount.toString()));

		if (mismatchCount === 0) {
			console.log(chalk.green('🎉 All slugs match their filenames!'));
		} else {
			console.log(
				chalk.yellow(
					'⚠️  Found ' + mismatchCount.toString() + ' file(s) with slug/filename mismatches',
				),
			);
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('Error checking slug mismatches:'), error);
		process.exit(1);
	}
}

function showHelp(): void {
	console.log(chalk.blue('Content Utilities'));
	console.log(chalk.blue('================'));
	console.log('Available commands:');
	console.log('  slug-mismatch    Check for MDX files where slug field does not match filename');
	console.log('                   (locations and regions collections only)');
	console.log('');
	console.log('Options:');
	console.log('  --verbose        Show detailed output');
	console.log('');
	console.log('Usage:');
	console.log('  pnpm content-utils slug-mismatch');
}

const command = process.argv[2];

switch (command) {
	case 'slug-mismatch': {
		await checkSlugMismatches();
		break;
	}
	case 'help':
	case '--help':
	case '-h': {
		showHelp();
		break;
	}
	default: {
		if (command) {
			console.log(chalk.red('Unknown command: ' + command));
			console.log('');
		}
		showHelp();
		if (command) process.exit(1);
		break;
	}
}
