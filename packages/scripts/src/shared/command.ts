import { resolveContentPaths } from '@spectralcodex/shared/paths';
import { createCommandRunner } from '@xsynaptic/astro-scripts';
import path from 'node:path';

export interface ScriptPaths {
	cachePath: string;
	contentDataPath: string;
	distPath: string;
	mediaPath: string;
	rootPath: string;
}

function resolveScriptPaths(rootPath: string): ScriptPaths {
	return {
		...resolveContentPaths(rootPath, process.env),
		distPath: path.join(rootPath, 'dist'),
		rootPath,
	};
}

export const { defineCommand, runCommand } = createCommandRunner({
	context: ({ rootPath }) => ({ paths: resolveScriptPaths(rootPath) }),
});
