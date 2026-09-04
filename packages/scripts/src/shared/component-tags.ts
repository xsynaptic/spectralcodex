export interface ComponentTag {
	lineNumber: number;
	name: string;
	props: string;
}

const componentTagRegex = /<([A-Z]\w*)((?:\s[^>]*?)?)\/?>/g;

// Line numbers are body-relative; a caller adds getBodyLineOffset to point at the file
export function findComponentTags(body: string, names: ReadonlyArray<string>) {
	const tags: Array<ComponentTag> = [];

	for (const match of body.matchAll(componentTagRegex)) {
		const name = match[1];

		if (!name || !names.includes(name)) continue;

		tags.push({
			lineNumber: body.slice(0, match.index).split('\n').length,
			name,
			props: match[2] ?? '',
		});
	}

	return tags;
}

// Anchored on a boundary so `data-id="x"` is not read as the `id` prop
export function getTagProp({ props }: ComponentTag, name: string) {
	return new RegExp(String.raw`(?:^|\s)${name}=["']([^"']+)["']`).exec(props)?.[1];
}
