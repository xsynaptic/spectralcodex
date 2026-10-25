import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function readFileIfExists(filePath: string) {
	try {
		return await fs.readFile(filePath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;

		throw error;
	}
}

export async function readJsonFile<Value>(filePath: string) {
	const data = await readFileIfExists(filePath);

	return data ? (JSON.parse(data.toString('utf8')) as Value) : undefined;
}

export async function writeJsonFile(filePath: string, value: unknown) {
	const temporary = `${filePath}.tmp`;

	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(temporary, `${JSON.stringify(value)}\n`);
	await fs.rename(temporary, filePath);
}
