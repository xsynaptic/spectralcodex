import { Refusal as PipelineRefusal } from '@xsynaptic/astro-image-pipeline/node';
import { parseArgs } from 'node:util';
import { describe, expect, test, vi } from 'vitest';
import { ProcessOutput } from 'zx';

import { defineCommand, formatHelp, getFailureReport, Refusal } from '#shared/cli-command.ts';

function getParseError() {
	try {
		parseArgs({ args: ['--dry-rn'], options: { 'dry-run': { type: 'boolean' } }, strict: true });
	} catch (error) {
		return error;
	}

	throw new Error('Expected parseArgs to reject the flag');
}

describe('getFailureReport', () => {
	test('points a mistyped flag at --help', () => {
		expect(getFailureReport(getParseError(), { isAborted: false })).toMatchObject({
			detail: 'See --help',
			exitCode: 1,
			isInterrupted: false,
			message: expect.stringContaining("Unknown option '--dry-rn'") as string,
		});
	});

	test('reports an abort as an interrupt with the command note, whatever was thrown', () => {
		expect(
			getFailureReport(new Error('fetch aborted'), {
				interrupted: 'progress is saved',
				isAborted: true,
			}),
		).toEqual({ exitCode: 130, isInterrupted: true, message: 'Interrupted; progress is saved' });
	});

	test('reports a child that exited on Ctrl-C as an interrupt', () => {
		expect(getFailureReport(new ProcessOutput(130), { isAborted: false })).toMatchObject({
			exitCode: 130,
			isInterrupted: true,
		});
	});

	test('reports a failed child by exit code alone', () => {
		expect(
			getFailureReport(new ProcessOutput(2, undefined, '', 'lots of stderr'), { isAborted: false }),
		).toEqual({ exitCode: 1, isInterrupted: false, message: 'Child process exited with code 2' });
	});

	test.each([
		{ label: 'ours', refusal: new Refusal('Build first') },
		{
			label: 'the image pipeline, whose class is its own',
			refusal: new PipelineRefusal('Build first'),
		},
	])('reports a refusal thrown by $label by its message alone', ({ refusal }) => {
		expect(getFailureReport(refusal, { isAborted: false })).toEqual({
			exitCode: 1,
			isInterrupted: false,
			message: 'Build first',
		});
	});

	test('keeps the stack of an unexpected error', () => {
		const report = getFailureReport(new TypeError('boom'), { isAborted: false });

		expect(report.message).toBe('boom');
		expect(report.detail).toContain('cli-command.test.ts');
	});
});

describe('formatHelp', () => {
	const command = defineCommand({
		name: 'render-images',
		options: {
			'clear-cache': { default: false, description: 'Render from scratch', type: 'boolean' },
			threshold: { default: '10', description: 'Distance in metres', type: 'string' },
		},
		positional: { description: 'One check by name', name: 'check' },
		run: vi.fn(),
		summary: 'Encode derivatives',
		title: 'Images',
	});

	test('lists the positional, options with their defaults, and help', () => {
		const lines = formatHelp(command).split('\n');

		expect(lines.slice(0, 4)).toEqual([
			'Images',
			'Encode derivatives',
			'',
			'Usage: pnpm render-images [check] [options]',
		]);
		expect(lines.slice(5).map((line) => line.trim().split(/\s{2,}/))).toEqual([
			['check', 'One check by name'],
			['--clear-cache', 'Render from scratch'],
			['--threshold <value>', 'Distance in metres (default: 10)'],
			['-h, --help', 'Show this help'],
		]);
	});
});
