import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';

export async function getRegionsDivisionSvgContent(entry: ComputedEntry<'regions'>) {
	if (!entry.data.divisionId) return;

	const filePath = path.join(process.cwd(), CUSTOM_CACHE_PATH, 'divisions', `${entry.id}.svg`);

	try {
		return await readFile(filePath, 'utf8');
	} catch (error) {
		throw new Error(
			`Region "${entry.id}" names a Division but ${filePath} is missing; run \`pnpm map-divisions\``,
			{ cause: error },
		);
	}
}
