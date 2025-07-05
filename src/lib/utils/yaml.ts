import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

import { CONTENT_DATA_PATH } from '#constants.ts';

/**
 * Load YAML data from the configured content data path
 */
export async function loadYamlData(filename: string): Promise<unknown> {
	try {
		const filePath = path.join(process.cwd(), CONTENT_DATA_PATH, filename);
		const fileContent = await readFile(filePath, 'utf8');

		return parse(fileContent) as unknown;
	} catch (error) {
		console.error(`Failed to load YAML data from ${filename}:`, error);

		throw new Error(`Failed to load YAML data from ${filename}`);
	}
}
