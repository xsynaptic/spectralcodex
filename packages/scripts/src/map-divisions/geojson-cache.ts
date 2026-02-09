import fs from 'node:fs/promises';
import path from 'node:path';

import type { DivisionGeometry, DivisionItem } from './types';

import { safelyCreateDirectory } from '../shared/utils';

export async function getDivisionDataCache(
	divisionId: string,
	cacheDir: string,
): Promise<DivisionItem | undefined> {
	const cacheFilePath = path.join(cacheDir, `${divisionId}.geojson`);

	try {
		await fs.access(cacheFilePath);
		const cachedData = await fs.readFile(cacheFilePath, 'utf8');
		const geometry = JSON.parse(cachedData) as DivisionGeometry;

		return {
			divisionId,
			geometry,
		};
	} catch {
		return undefined;
	}
}

export async function saveDivisionDataCache(
	divisionId: string,
	geometry: DivisionGeometry,
	cacheDir: string,
) {
	safelyCreateDirectory(cacheDir);

	const cacheFilePath = path.join(cacheDir, `${divisionId}.geojson`);

	// eslint-disable-next-line unicorn/no-null
	await fs.writeFile(cacheFilePath, JSON.stringify(geometry, null, 2));
}
