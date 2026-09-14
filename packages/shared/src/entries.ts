// Anonymized locations present their override id publicly; everything else uses the entry id
export function getPublicId(entry: { data: unknown; id: string }): string {
	const { override } = entry.data as { override?: { id?: string } };

	return override?.id ?? entry.id;
}
