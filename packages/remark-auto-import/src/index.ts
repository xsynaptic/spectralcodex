import type { Root } from 'mdast';
import type { MdxjsEsm } from 'mdast-util-mdx';
import type { Plugin } from 'unified';

import { parse as parseJs } from 'acorn';
import nodePath from 'node:path';
import { z } from 'zod';

const namedImportSchema = z.union([z.string(), z.tuple([z.string(), z.string()])]);

// This plugin accepts a bare path or a path mapped to either a namespace alias (`* as X`) or a list of named imports
const importsConfigSchema = z.array(
	z.union([z.string(), z.record(z.string(), z.union([z.string(), z.array(namedImportSchema)]))]),
);

const optionsSchema = z.object({
	imports: importsConfigSchema,
});

type NamedImportConfig = z.output<typeof namedImportSchema>;

type ImportsConfig = z.output<typeof importsConfigSchema>;

type RemarkAutoImportOptions = z.input<typeof optionsSchema>;

function resolveModulePath(path: string): string {
	// Bare specifiers (e.g. npm modules) are left unresolved
	if (path.startsWith('.')) return nodePath.resolve(path);

	return path;
}

// Strips punctuation, so 'complex-component.astro' => 'coolcomponent'
function getDefaultImportName(path: string): string {
	return nodePath.parse(path).name.replaceAll(/[^\w\d]/g, '');
}

function formatImport(imported: string, module: string): string {
	return `import ${imported} from ${JSON.stringify(module)};`;
}

function formatNamedImports(namedImports: Array<NamedImportConfig>): string {
	const imports: Array<string> = [];

	for (const namedImport of namedImports) {
		if (typeof namedImport === 'string') {
			imports.push(namedImport);
		} else {
			const [from, as] = namedImport;
			imports.push(`${from} as ${as}`);
		}
	}

	return `{ ${imports.join(', ')} }`;
}

function processImportsConfig(config: ImportsConfig): Array<string> {
	const imports: Array<string> = [];

	for (const option of config) {
		if (typeof option === 'string') {
			imports.push(formatImport(getDefaultImportName(option), resolveModulePath(option)));
			continue;
		}

		for (const [path, namedImportsOrNamespace] of Object.entries(option)) {
			if (typeof namedImportsOrNamespace === 'string') {
				imports.push(formatImport(`* as ${namedImportsOrNamespace}`, resolveModulePath(path)));
			} else {
				imports.push(
					formatImport(formatNamedImports(namedImportsOrNamespace), resolveModulePath(path)),
				);
			}
		}
	}

	return imports;
}

function generateImportsNode(config: ImportsConfig): MdxjsEsm {
	const js = processImportsConfig(config).join('\n');
	const estree = parseJs(js, { ecmaVersion: 'latest', sourceType: 'module' });

	return {
		type: 'mdxjsEsm',
		value: js,
		// Acorn's AST nodes are structurally compatible with the estree types MDX expects
		data: { estree: estree as unknown as NonNullable<MdxjsEsm['data']>['estree'] },
	};
}

export function remarkAutoImport(options: RemarkAutoImportOptions): Plugin<[], Root> {
	const { imports } = optionsSchema.parse(options);
	const importsNode = generateImportsNode(imports);

	return function () {
		return function (tree, file) {
			// Only .mdx supports the ESM imports we inject; plain .md is left untouched
			if (file.basename?.endsWith('.mdx')) {
				tree.children.unshift(importsNode);
			}
		};
	};
}

export type { RemarkAutoImportOptions };
