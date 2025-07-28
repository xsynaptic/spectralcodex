import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

import { CONTENT_DATA_PATH } from '#constants.ts';

async function loadDataFile(filename: string) {
	try {
		const filePath = path.join(process.cwd(), CONTENT_DATA_PATH, filename);

		return await readFile(filePath, 'utf8');
	} catch (error) {
		console.error(`Failed to load data from ${filename}:`, error);

		throw new Error(`Failed to load data from ${filename}`);
	}
}

/**
 * Load YAML data from the configured content data path
 */
export async function loadYamlData(filename: string) {
	try {
		const fileContent = await loadDataFile(filename);

		return parse(fileContent) as unknown;
	} catch (error) {
		console.error(`Failed to load YAML data from ${filename}:`, error);

		throw new Error(`Failed to load YAML data from ${filename}`);
	}
}

/**
 * Load JSON data from the configured content data path
 */
export async function loadJsonData(filename: string) {
	try {
		const fileContent = await loadDataFile(filename);

		return JSON.parse(fileContent) as unknown;
	} catch (error) {
		console.error(`Failed to load JSON data from ${filename}:`, error);

		throw new Error(`Failed to load JSON data from ${filename}`);
	}
}
