import { resolveContentPaths } from '@spectralcodex/shared/paths';
import { createCommandRunner } from '@xsynaptic/astro-scripts';

export interface ScriptPaths {
	cachePath: string;
	contentDataPath: string;
	mediaPath: string;
}

export const { runCommand } = createCommandRunner({
	context: ({ rootPath }) => ({ paths: resolveContentPaths(rootPath, process.env) }),
});
