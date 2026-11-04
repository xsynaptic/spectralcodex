import { siteBasePath } from '@spectralcodex/shared/routing';
import { readFileSync } from 'node:fs';
import { findPackageJSON } from 'node:module';

interface PackageJson {
	version: string;
}

// Neither Pagefind package exports its package.json
export function getPackageVersion(packageName: string) {
	const packageJsonPath = findPackageJSON(packageName, import.meta.url);

	if (packageJsonPath === undefined) throw new Error(`Cannot find ${packageName}'s package.json`);

	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson;

	return packageJson.version;
}

export const pagefindVersion = getPackageVersion('pagefind');

// Versioned so an upgrade changes the URL of the fixed-name files on the year-long `*.js` cache tier
export const pagefindBundleDir = `pagefind/${pagefindVersion}/`;

export const pagefindBundlePath = `${siteBasePath}${pagefindBundleDir}`;
