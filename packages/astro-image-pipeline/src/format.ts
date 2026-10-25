export function formatList(items: ReadonlyArray<string>) {
	return items
		.slice(0, 10)
		.map((item) => `  ${item}`)
		.join('\n');
}
