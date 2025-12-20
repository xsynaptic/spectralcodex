import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

/**
 * A general file loading function that resolves the file path relative to the project root
 */
async function loadDataFile(filePath: string) {
	const resolvedFilePath = path.join(process.cwd(), filePath);

	return readFile(resolvedFilePath, 'utf8');
}

/**
 * Load YAML data from the configured content data path
 */
export async function loadYamlData(filePath: string) {
	const fileContent = await loadDataFile(filePath);

	return parse(fileContent) as unknown;
}

/**
 * Load JSON data from the configured content data path
 */
export async function loadJsonData(filePath: string) {
	const fileContent = await loadDataFile(filePath);

	return JSON.parse(fileContent) as unknown;
}
