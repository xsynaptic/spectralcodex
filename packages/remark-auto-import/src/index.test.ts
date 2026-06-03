import type { Root } from 'mdast';

import nodePath from 'node:path';
import { describe, expect, test } from 'vitest';

import type { RemarkAutoImportOptions } from './index.ts';

import { remarkAutoImport } from './index.ts';

type SyncTransform = (tree: Root, file: { basename?: string }) => void;

function inject(options: RemarkAutoImportOptions, basename: string): Root {
	const tree: Root = { type: 'root', children: [{ type: 'paragraph', children: [] }] };
	const createTransform = remarkAutoImport(options) as unknown as () => SyncTransform;

	createTransform()(tree, { basename });

	return tree;
}

interface InjectedImport {
	source: string;
	specifiers: Array<string>;
}

// Flatten the injected mdxjsEsm node back into a readable shape for assertions
function injectedImports(tree: Root): Array<InjectedImport> {
	const node = tree.children.find((child) => child.type === 'mdxjsEsm');

	if (node?.type !== 'mdxjsEsm') return [];

	const body = node.data?.estree?.body ?? [];

	return body.flatMap((statement) => {
		if (statement.type !== 'ImportDeclaration') return [];

		const specifiers = statement.specifiers.map((specifier) => {
			if (specifier.type === 'ImportDefaultSpecifier') return specifier.local.name;
			if (specifier.type === 'ImportNamespaceSpecifier') return `* as ${specifier.local.name}`;

			const imported =
				specifier.imported.type === 'Identifier'
					? specifier.imported.name
					: String(specifier.imported.value);

			return imported === specifier.local.name
				? imported
				: `${imported} as ${specifier.local.name}`;
		});

		return [{ source: String(statement.source.value), specifiers }];
	});
}

describe('remarkAutoImport', () => {
	test('injects named imports at the top of an .mdx tree', () => {
		const tree = inject(
			{
				imports: [
					{
						'./src/components/mdx/img.astro': [['default', 'Img']],
						'./src/lib/helpers.ts': ['parse', ['format', 'fmt']],
					},
				],
			},
			'post.mdx',
		);

		expect(tree.children[0]?.type).toBe('mdxjsEsm');
		expect(injectedImports(tree)).toEqual([
			{
				source: nodePath.resolve('./src/components/mdx/img.astro'),
				specifiers: ['default as Img'],
			},
			{ source: nodePath.resolve('./src/lib/helpers.ts'), specifiers: ['parse', 'format as fmt'] },
		]);
	});

	test('a bare path becomes a default import named after the file', () => {
		const tree = inject({ imports: ['./src/components/mdx/complex-component.astro'] }, 'post.mdx');

		expect(injectedImports(tree)).toEqual([
			{
				source: nodePath.resolve('./src/components/mdx/complex-component.astro'),
				specifiers: ['coolcomponent'],
			},
		]);
	});

	test('a string value becomes a namespace import', () => {
		const tree = inject({ imports: [{ './src/lib/helpers.ts': 'Helpers' }] }, 'post.mdx');

		expect(injectedImports(tree)).toEqual([
			{ source: nodePath.resolve('./src/lib/helpers.ts'), specifiers: ['* as Helpers'] },
		]);
	});

	test('bare module specifiers are left unresolved', () => {
		const tree = inject({ imports: [{ 'remark-gfm': 'RemarkGfm' }] }, 'post.mdx');

		expect(injectedImports(tree)[0]?.source).toBe('remark-gfm');
	});

	test('does not inject into .md files', () => {
		const tree = inject(
			{ imports: [{ './src/components/mdx/img.astro': [['default', 'Img']] }] },
			'post.md',
		);

		expect(tree.children.some((child) => child.type === 'mdxjsEsm')).toBe(false);
	});

	test('rejects invalid options', () => {
		// @ts-expect-error - imports must be an array
		expect(() => remarkAutoImport({ imports: 'nope' })).toThrow();
	});
});
