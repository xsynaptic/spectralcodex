import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

/**
 * A general file loading function that resolves the file path relative to the project root
 */
async function loadDataFile(filePath: string) {
	try {
		const resolvedFilePath = path.join(process.cwd(), filePath);

		return await readFile(resolvedFilePath, 'utf8');
	} catch (error) {
		console.error(`Failed to load data from ${filePath}:`, error);

		throw new Error(`Failed to load data from ${filePath}`);
	}
}

/**
 * Load YAML data from the configured content data path
 */
export async function loadYamlData(filePath: string) {
	try {
		const fileContent = await loadDataFile(filePath);

		return parse(fileContent) as unknown;
	} catch (error) {
		console.error(`Failed to load YAML data from ${filePath}:`, error);

		throw new Error(`Failed to load YAML data from ${filePath}`);
	}
}

/**
 * Load JSON data from the configured content data path
 */
export async function loadJsonData(filePath: string) {
	try {
		const fileContent = await loadDataFile(filePath);

		return JSON.parse(fileContent) as unknown;
	} catch (error) {
		console.error(`Failed to load JSON data from ${filePath}:`, error);

		throw new Error(`Failed to load JSON data from ${filePath}`);
	}
}
