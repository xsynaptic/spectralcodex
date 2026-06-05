// MDXLint ships no type declarations; declare the minimal surface we use.
// Its processor is a unified Processor, so the config plugins are a PluggableList
declare module 'mdxlint' {
	import type { PluggableList } from 'unified';

	interface MdxlintMessage {
		message: string;
	}

	interface MdxlintResult {
		messages: ReadonlyArray<MdxlintMessage>;
		toString(): string;
	}

	interface MdxlintProcessor {
		data(key: string, value: unknown): MdxlintProcessor;
		use(plugins: PluggableList): MdxlintProcessor;
		process(file: { value: string; path: string }): Promise<MdxlintResult>;
	}

	export function mdxlint(): MdxlintProcessor;
	export function defineConfig<T>(config: T): T;
}
