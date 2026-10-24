export const entryQualityFloor = { featured: 3, listed: 2 } as const;

function getOverride(data: unknown) {
	return (data as { override?: { id?: string } }).override;
}

// Anonymized locations present their override id publicly; everything else uses the entry id
export function getPublicId(entry: { data: unknown; id: string }): string {
	return getOverride(entry.data)?.id ?? entry.id;
}

export function applyLocationOverride<Data extends object>(data: Data): Data {
	const override = getOverride(data);

	if (!override) return data;

	const { id: _, ...fields } = override;

	return { ...data, ...fields };
}
