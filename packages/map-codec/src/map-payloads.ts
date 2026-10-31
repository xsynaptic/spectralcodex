export const mapPayloadName = {
	directory: 'map-directory',
	manifest: 'map-manifest',
	scopes: 'map-scopes',
} as const;

export interface MapPayloadBase {
	path: string;
	prefix: string;
	version: string;
}

export function getMapPayloadId(prefix: string, name: string) {
	return `${prefix}${name}`;
}

export function getMapPayloadUrl({ path, prefix, version }: MapPayloadBase, name: string) {
	return `${path}/${getMapPayloadId(prefix, name)}.json?v=${version}`;
}
