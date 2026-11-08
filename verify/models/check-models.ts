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

const tlcExitCode = {
	holds: 0,
	invariantBroken: 12,
	propertyBroken: 13,
} as const;

const coverageRowPattern = /^<(\w+) line [^>]*>: \d+:(\d+)$/gm;
const deadExpressionPattern =
	/^\s+\|*line (\d+), col (\d+) to line \d+, col \d+ of module (\w+): 0$/gm;
const coverageHeader = 'The coverage statistics at';
// Progress lines repeat this phrase with thousands separators; only the final summary starts a line
const finalCountPattern = /^\d+ states generated, (\d+) distinct states found/m;

function runTlc(runDirectory: string, { cfg, flags = [], label, model, module }: TlcRun) {
	const configFile = `${model}-${label}.cfg`;

	writeFileSync(path.join(runDirectory, configFile), `${cfg.join('\n')}\n`);

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
			`/cfg/${configFile}`,
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
	return {
		isPassed: false,
		line: `${model}: TLC could not run ${label}`,
		output,
	};
}

function getRuleKeyword({ properties }: ModelClaims, rule: string) {
	return properties.includes(rule) ? 'PROPERTY' : 'INVARIANT';
}

function getRuleLines(keyword: string, rules: Array<string>) {
	return rules.length > 0 ? [`${keyword} ${rules.join(' ')}`] : [];
}

// TLC prints a block every `-coverage` interval, so an action reached late reads 0 in the earlier ones
function readCoverage(output: string) {
	const finalCoverage = output.slice(output.lastIndexOf(coverageHeader));
	const deadActions: Array<string> = [];
	let isInitCovered = false;

	for (const [, action, total] of finalCoverage.matchAll(coverageRowPattern)) {
		if (action === 'Init') isInitCovered = true;
		if (action === undefined || action === 'Init' || total !== '0') continue;
		deadActions.push(action);
	}

	const deadExpressions = [...finalCoverage.matchAll(deadExpressionPattern)].map(
		([, line, column, module]) => `${String(module)}.tla:${String(line)}:${String(column)}`,
	);

	return { deadActions, deadExpressions, isInitCovered };
}

function getCoverageFailure(model: string, output: string): CheckResult | undefined {
	const { deadActions, deadExpressions, isInitCovered } = readCoverage(output);

	// Unparsed coverage would otherwise read as every action enabled
	if (!isInitCovered) {
		return {
			isPassed: false,
			line: `${model}: no coverage rows read from TLC's output`,
			output,
		};
	}

	if (deadActions.length > 0) {
		return {
			isPassed: false,
			line: `${model}: never enabled: ${deadActions.join(', ')}`,
		};
	}

	if (deadExpressions.length > 0) {
		return {
			isPassed: false,
			line: `${model}: never evaluated: ${deadExpressions.join(', ')}`,
		};
	}

	return;
}

function checkHolds(runDirectory: string, model: string, modelClaims: ModelClaims): CheckResult {
	const { holds, properties } = modelClaims;
	const rules = [...holds, ...properties];
	const { output, verdict } = runTlc(runDirectory, {
		cfg: [
			'SPECIFICATION Spec',
			...getRuleLines('INVARIANT', holds),
			...getRuleLines('PROPERTY', properties),
		],
		flags: ['-coverage', '1'],
		label: 'holds',
		model,
		module: 'spec',
	});

	if (verdict === 'error') return getToolError(model, 'holds', output);
	if (verdict === 'breaks') {
		return {
			isPassed: false,
			line: `${model}: a rule that should hold breaks`,
			output,
		};
	}

	const coverageFailure = getCoverageFailure(model, output);

	if (coverageFailure) return coverageFailure;

	const states = finalCountPattern.exec(output)?.[1] ?? '?';
	const holding = rules.length > 0 ? `${rules.join(', ')} hold` : 'no rule holds yet';

	return {
		isPassed: true,
		line: `${model}: ${holding} over ${states} states, every action enabled`,
	};
}

function checkMutant(
	runDirectory: string,
	model: string,
	{ keyword, mutant, replace, rule }: ModelClaims['mutants'][number] & { keyword: string },
): CheckResult {
	const { output, verdict } = runTlc(runDirectory, {
		cfg: [
			'SPECIFICATION Spec',
			`${keyword} ${rule}`,
			`CONSTANT ${replace} <- ${mutant}`,
			// The holds run owns deadlock; a mutant is judged only on its rule
			'CHECK_DEADLOCK FALSE',
		],
		label: `mutant-${mutant}`,
		model,
		module: 'mutants',
	});

	if (verdict === 'error') return getToolError(model, `mutant ${mutant}`, output);
	if (verdict === 'holds') {
		return {
			isPassed: false,
			line: `${model}: mutant ${mutant} leaves ${rule} holding`,
		};
	}

	return { isPassed: true, line: `${model}: mutant ${mutant} breaks ${rule}` };
}

function checkFinding(
	runDirectory: string,
	model: string,
	{ isTemporal = false, rule }: ModelClaims['findings'][number],
): CheckResult {
	const { output, verdict } = runTlc(runDirectory, {
		cfg: [
			'SPECIFICATION Spec',
			`${isTemporal ? 'PROPERTY' : 'INVARIANT'} ${rule}`,
			'CHECK_DEADLOCK FALSE',
		],
		label: `finding-${rule}`,
		model,
		module: 'spec',
	});

	if (verdict === 'error') return getToolError(model, `finding ${rule}`, output);
	if (verdict === 'holds') {
		return {
			isPassed: false,
			line: `${model}: finding ${rule} now holds; move it to holds`,
		};
	}

	return { isPassed: true, line: `${model}: finding ${rule} still breaks` };
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
		return {
			isPassed: false,
			line: `${model}: the witness path is not reachable`,
		};
	}

	return { isPassed: true, line: `${model}: the witness path is reachable` };
}

function* checkModel(runDirectory: string, model: string, modelClaims: ModelClaims | undefined) {
	if (!modelClaims) {
		yield { isPassed: false, line: `${model}: no entry in claims.ts` };
		return;
	}

	if (!existsSync(path.join(modelsDirectory, model, 'spec.tla'))) {
		yield { isPassed: false, line: `${model}: claims.ts names a model with no spec.tla` };
		return;
	}

	// TypeOK only bounds the variables, so a mutant of it would test TLC rather than the model
	// A state predicate listed as a property is checked on Init alone, and only a mutant shows that
	const unmutatedRules = [...modelClaims.holds, ...modelClaims.properties].filter(
		(rule) => rule !== 'TypeOK' && modelClaims.mutants.every((mutant) => mutant.rule !== rule),
	);

	if (unmutatedRules.length > 0) {
		yield {
			isPassed: false,
			line: `${model}: no mutant shows these can break: ${unmutatedRules.join(', ')}`,
		};
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

	for (const finding of modelClaims.findings) {
		yield checkFinding(runDirectory, model, finding);
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
const modelDirectories = readdirSync(modelsDirectory, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name);
const models = [...new Set([...modelDirectories, ...claimsByModel.keys()])];

// Compose reuses any image carrying the tag, so a changed Dockerfile only lands through a build
const build = spawnSync('docker', [...composeArguments, 'build', '-q'], {
	stdio: 'inherit',
});

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
