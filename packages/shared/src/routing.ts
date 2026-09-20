// Drop-in replacement for the url-join package
export function joinUrl(...parts: Array<string>): string {
	return parts.join('/').replaceAll(/(?<!:)\/\/+/g, '/');
}
