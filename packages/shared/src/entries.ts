// Anonymized locations present their override id publicly; everything else uses the entry id
export function getPublicId(entry: { id: string; data: unknown }): string {
	const { override } = entry.data as { override?: { id?: string } };

	return override?.id ?? entry.id;
}
