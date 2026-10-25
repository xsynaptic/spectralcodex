import type { ParseArgsOptionDescriptor } from 'node:util';

import { resolveContentPaths } from '@spectralcodex/shared/paths';
import chalk from 'chalk';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as R from 'remeda';
import { ProcessOutput } from 'zx';

import { formatDuration, log, stopActiveSpinner, symbols } from '#shared/cli-output.ts';

export class Refusal extends Error {
	override name = 'Refusal';
}

function isRefusal(error: unknown): error is Refusal {
	return error instanceof Error && error.name === 'Refusal';
}

type CommandOption = ParseArgsOptionDescriptor & { description: string };

type CommandOptions = Record<string, CommandOption>;

interface CommandPositional {
	description: string;
	name: string;
}

type ParsedValues<Options extends CommandOptions> = ReturnType<
	typeof parseArgs<{ allowPositionals: true; options: Options; strict: true }>
>['values'];

export interface ScriptPaths {
	cachePath: string;
	contentDataPath: string;
	distPath: string;
	mediaPath: string;
	rootPath: string;
}

interface CommandContext<Options extends CommandOptions> {
	paths: ScriptPaths;
	positionals: Array<string>;
	signal: AbortSignal;
	values: ParsedValues<Options>;
}

interface Command<Options extends CommandOptions> {
	interrupted?: string;
	name: string;
	options?: Options;
	positional?: CommandPositional;
	run: (context: CommandContext<Options>) => Promise<void> | void;
	summary: string;
	title: string;
}

interface FailureReport {
	detail?: string;
	exitCode: number;
	isInterrupted: boolean;
	message: string;
}

const interruptedExitCode = 130;
const interruptBurstMs = 1000;

const helpOption = {
	description: 'Show this help',
	short: 'h',
	type: 'boolean',
} as const satisfies CommandOption;

export function defineCommand<const Options extends CommandOptions>(command: Command<Options>) {
	return command;
}

export function parseNumberOption(value: string, name: string) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed)) throw new Refusal(`--${name} expects a number, got "${value}"`);

	return parsed;
}

function getUsage(command: Command<CommandOptions>) {
	const positional = command.positional ? ` [${command.positional.name}]` : '';

	return `pnpm ${command.name}${positional} [options]`;
}

function getOptionLabel(name: string, option: CommandOption) {
	const flag = option.short ? `-${option.short}, --${name}` : `    --${name}`;

	return option.type === 'string' ? `${flag} <value>` : flag;
}

function getOptionDescription(option: CommandOption) {
	const { default: defaultValue, description } = option;

	if (defaultValue === undefined || defaultValue === false) return description;
	if (Array.isArray(defaultValue) && defaultValue.length === 0) return description;

	return `${description} (default: ${String(defaultValue)})`;
}

export function formatHelp(command: Command<CommandOptions>) {
	const options = Object.entries({ ...command.options, help: helpOption });
	const rows: Array<[string, string]> = options.map(([name, option]) => [
		getOptionLabel(name, option),
		getOptionDescription(option),
	]);

	if (command.positional) {
		rows.unshift([command.positional.name, command.positional.description]);
	}

	const width = Math.max(...rows.map(([label]) => label.length)) + 2;

	return [
		chalk.magenta(command.title),
		command.summary,
		'',
		`Usage: ${getUsage(command)}`,
		'',
		...rows.map(([label, description]) => `  ${label.padEnd(width)}${chalk.gray(description)}`),
	].join('\n');
}

function isParseError(error: unknown): error is Error {
	return (
		error instanceof Error &&
		'code' in error &&
		typeof error.code === 'string' &&
		error.code.startsWith('ERR_PARSE_ARGS_')
	);
}

function isInterruption(error: unknown, isAborted: boolean) {
	if (isAborted) return true;

	return (
		error instanceof ProcessOutput &&
		(error.exitCode === interruptedExitCode || error.signal === 'SIGINT')
	);
}

function describeError(error: unknown): Pick<FailureReport, 'detail' | 'message'> {
	if (isParseError(error)) return { detail: 'See --help', message: error.message };

	if (isRefusal(error)) return { message: error.message };

	if (error instanceof ProcessOutput) {
		const reason = error.signal
			? `was killed by ${error.signal}`
			: `exited with code ${String(error.exitCode)}`;

		return { message: `Child process ${reason}` };
	}

	if (!(error instanceof Error)) return { message: String(error) };

	const stack = error.stack?.split('\n').slice(1).join('\n');

	return stack ? { detail: stack, message: error.message } : { message: error.message };
}

export function getFailureReport(
	error: unknown,
	{ interrupted, isAborted }: { interrupted?: string | undefined; isAborted: boolean },
): FailureReport {
	if (isInterruption(error, isAborted)) {
		return {
			exitCode: interruptedExitCode,
			isInterrupted: true,
			message: interrupted ? `Interrupted; ${interrupted}` : 'Interrupted',
		};
	}

	return { exitCode: 1, isInterrupted: false, ...describeError(error) };
}

function findWorkspaceRoot(startDir: string = process.cwd()): string {
	let current = path.resolve(startDir);

	while (current !== path.dirname(current)) {
		if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;

		current = path.dirname(current);
	}

	throw new Error(`Could not locate pnpm-workspace.yaml above ${startDir}`);
}

function resolveScriptPaths(): ScriptPaths {
	const rootPath = findWorkspaceRoot();

	return {
		...resolveContentPaths(rootPath, process.env),
		distPath: path.join(rootPath, 'dist'),
		rootPath,
	};
}

function parseCommandArgs<Options extends CommandOptions>(command: Command<Options>) {
	const options = R.mapValues({ ...command.options, help: helpOption }, (option) =>
		R.omit(option, ['description']),
	);

	return parseArgs({
		allowPositionals: command.positional !== undefined,
		args: process.argv.slice(2),
		options,
		strict: true,
	});
}

export async function runCommand<Options extends CommandOptions>(command: Command<Options>) {
	const controller = new AbortController();
	const startTime = Date.now();
	let interruptTime: number | undefined;

	// One Ctrl-C arrives as a burst: the terminal's SIGINT, pnpm's forwarded copy, and a SIGTERM per nested pnpm
	function onInterrupt() {
		if (interruptTime === undefined) {
			interruptTime = Date.now();
			controller.abort();
			log.warn('Stopping; press Ctrl-C again to force quit');
			return;
		}

		if (Date.now() - interruptTime < interruptBurstMs) return;

		stopActiveSpinner(symbols.error);
		log.error('Force quit');
		process.exit(interruptedExitCode);
	}

	process.on('SIGINT', onInterrupt);
	process.on('SIGTERM', onInterrupt);

	try {
		const { positionals, values } = parseCommandArgs(command);

		if (values.help) {
			log.data(formatHelp(command));
			return;
		}

		log.title(command.title);

		await command.run({
			paths: resolveScriptPaths(),
			positionals,
			signal: controller.signal,
			values: values as ParsedValues<Options>,
		});

		log.detail(`Finished in ${formatDuration(Date.now() - startTime)}`);
	} catch (error) {
		const report = getFailureReport(error, {
			interrupted: command.interrupted,
			isAborted: controller.signal.aborted,
		});

		stopActiveSpinner(symbols.error);

		if (report.isInterrupted) {
			log.warn(report.message);
		} else {
			log.error(report.message);
		}

		if (report.detail) log.detail(report.detail);

		process.exitCode = report.exitCode;
	} finally {
		process.off('SIGINT', onInterrupt);
		process.off('SIGTERM', onInterrupt);
	}
}
