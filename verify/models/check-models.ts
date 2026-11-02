import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ModelClaims } from './claims.ts';

import { claims } from './claims.ts';

interface CheckResult {
	isPassed: boolean;
	line: string;
	output?: string;
}

interface TlcRun {
	cfg: Array<string>;
	flags?: Array<string>;
	label: string;
	model: string;
	module: string;
}

const modelsDirectory = import.meta.dirname;
const composeArguments = ['compose', '-f', path.join(modelsDirectory, 'compose.yaml')];

const tlcExitCode = { holds: 0, invariantBroken: 12, propertyBroken: 13 } as const;

const coverageRowPattern = /^<(\w+) line [^>]*>: \d+:(\d+)$/gm;

function runTlc(runDirectory: string, { cfg, flags = [], label, model, module }: TlcRun) {
	const cfgFile = `${model}-${label}.cfg`;

	writeFileSync(path.join(runDirectory, cfgFile), `${cfg.join('\n')}\n`);

	const result = spawnSync(
		'docker',
		[
			...composeArguments,
			'run',
			'--rm',
			'-q',
			'-v',
			`${runDirectory}:/cfg:ro`,
			'tlc',
			'-workers',
			'1',
			'-fp',
			'0',
			'-metadir',
			'/tmp/tlc',
			...flags,
			'-config',
			`/cfg/${cfgFile}`,
			`${model}/${module}.tla`,
		],
		{ encoding: 'utf8', maxBuffer: 1 << 26 },
	);

	if (result.error) throw result.error;

	const output = `${result.stdout}${result.stderr}`;

	if (result.status === tlcExitCode.holds) return { output, verdict: 'holds' } as const;
	if (
		result.status === tlcExitCode.invariantBroken ||
		result.status === tlcExitCode.propertyBroken
	) {
		return { output, verdict: 'breaks' } as const;
	}

	return { output, verdict: 'error' } as const;
}

function getToolError(model: string, label: string, output: string): CheckResult {
	return { isPassed: false, line: `${model}: TLC could not run ${label}`, output };
}

function getRuleKeyword({ properties }: ModelClaims, rule: string) {
	return properties.includes(rule) ? 'PROPERTY' : 'INVARIANT';
}

function checkHolds(runDirectory: string, model: string, modelClaims: ModelClaims): CheckResult {
	const { holds, properties } = modelClaims;
	const rules = [...holds, ...properties];
	const { output, verdict } = runTlc(runDirectory, {
		cfg: [
			'SPECIFICATION Spec',
			`INVARIANT ${holds.join(' ')}`,
			...(properties.length > 0 ? [`PROPERTY ${properties.join(' ')}`] : []),
		],
		flags: ['-coverage', '1'],
		label: 'holds',
		model,
		module: 'spec',
	});

	if (verdict === 'error') return getToolError(model, 'holds', output);
	if (verdict === 'breaks') {
		return { isPassed: false, line: `${model}: a rule that should hold breaks`, output };
	}

	const deadActions = [...output.matchAll(coverageRowPattern)]
		.filter(([, action, total]) => action !== 'Init' && total === '0')
		.map(([, action]) => action);

	if (deadActions.length > 0) {
		return { isPassed: false, line: `${model}: never enabled: ${deadActions.join(', ')}` };
	}

	const states = /(\d+) distinct states found/.exec(output)?.[1] ?? '?';

	return {
		isPassed: true,
		line: `${model}: ${rules.join(', ')} hold over ${states} states, every action enabled`,
	};
}

function checkMutant(
	runDirectory: string,
	model: string,
	{ keyword, mutant, replace, rule }: ModelClaims['mutants'][number] & { keyword: string },
): CheckResult {
	const { output, verdict } = runTlc(runDirectory, {
		cfg: ['SPECIFICATION Spec', `${keyword} ${rule}`, `CONSTANT ${replace} <- ${mutant}`],
		label: `mutant-${mutant}`,
		model,
		module: 'mutants',
	});

	if (verdict === 'error') return getToolError(model, `mutant ${mutant}`, output);
	if (verdict === 'holds') {
		return { isPassed: false, line: `${model}: mutant ${mutant} leaves ${rule} holding` };
	}

	return { isPassed: true, line: `${model}: mutant ${mutant} breaks ${rule}` };
}

function checkWitness(runDirectory: string, model: string): CheckResult {
	const { output, verdict } = runTlc(runDirectory, {
		cfg: ['SPECIFICATION WitnessSpec', 'INVARIANT PathNotReplayed', 'CHECK_DEADLOCK FALSE'],
		label: 'witness',
		model,
		module: 'witness',
	});

	if (verdict === 'error') return getToolError(model, 'witness', output);
	if (verdict === 'holds') {
		return { isPassed: false, line: `${model}: the witness path is not reachable` };
	}

	return { isPassed: true, line: `${model}: the witness path is reachable` };
}

function* checkModel(runDirectory: string, model: string, modelClaims: ModelClaims | undefined) {
	if (!modelClaims) {
		yield { isPassed: false, line: `${model}: no entry in claims.ts` };
		return;
	}

	yield checkHolds(runDirectory, model, modelClaims);

	for (const mutant of modelClaims.mutants) {
		if (![...modelClaims.holds, ...modelClaims.properties].includes(mutant.rule)) {
			yield {
				isPassed: false,
				line: `${model}: mutant ${mutant.mutant} targets ${mutant.rule}, not a holding rule`,
			};
			continue;
		}

		yield checkMutant(runDirectory, model, {
			...mutant,
			keyword: getRuleKeyword(modelClaims, mutant.rule),
		});
	}

	if (existsSync(path.join(modelsDirectory, model, 'witness.tla'))) {
		yield checkWitness(runDirectory, model);
	}
}

function reportModel(runDirectory: string, model: string, modelClaims: ModelClaims | undefined) {
	let failures = 0;

	for (const result of checkModel(runDirectory, model, modelClaims)) {
		console.log(`${result.isPassed ? 'ok  ' : 'FAIL'} ${result.line}`);

		if (result.isPassed) continue;

		failures += 1;

		if (result.output) console.log(result.output.split('\n').slice(-30).join('\n'));
	}

	return failures;
}

const claimsByModel = new Map<string, ModelClaims>(Object.entries(claims));
const models = readdirSync(modelsDirectory, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name);

// Compose reuses any image carrying the tag, so a changed Dockerfile only lands through a build
const build = spawnSync('docker', [...composeArguments, 'build', '-q'], { stdio: 'inherit' });

if (build.status !== 0) throw new Error('The TLC image failed to build');

const runDirectory = mkdtempSync(path.join(tmpdir(), 'check-models-'));
let failures = 0;

try {
	for (const model of models) {
		failures += reportModel(runDirectory, model, claimsByModel.get(model));
	}
} finally {
	rmSync(runDirectory, { force: true, recursive: true });
}

process.exitCode = failures > 0 ? 1 : 0;
