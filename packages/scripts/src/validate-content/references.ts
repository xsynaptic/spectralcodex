import type { ContentEntry } from '#shared/astro-content.ts';

import { toValidationResult } from './validation-result.ts';

interface EntryReference {
	field: string;
	collection: string;
	id: string;
}

interface ReferenceIssue extends EntryReference {
	location: string;
}

function toEntryReference(
	record: Record<string, unknown>,
	field: string,
): EntryReference | undefined {
	if (typeof record.collection !== 'string' || typeof record.id !== 'string') return undefined;

	return { field, collection: record.collection, id: record.id };
}

/**
 * `reference()` stores pointers as `{id, collection}`, so the data declares which fields point at other entries
 * Walking for that shape keeps this check free of any hand-maintained list of reference fields
 */
function collectEntryReferences(value: unknown, field: string, references: Array<EntryReference>) {
	if (value === null || typeof value !== 'object') return;

	if (Array.isArray(value)) {
		for (const [index, item] of value.entries()) {
			collectEntryReferences(item, `${field}[${index.toString()}]`, references);
		}
		return;
	}

	const record = value as Record<string, unknown>;
	const reference = toEntryReference(record, field);

	if (reference) {
		references.push(reference);
		return;
	}

	for (const [key, item] of Object.entries(record)) {
		collectEntryReferences(item, field ? `${field}.${key}` : key, references);
	}
}

function getIdsByCollection(entries: Array<ContentEntry>) {
	const idsByCollection = new Map<string, Set<string>>();

	for (const entry of entries) {
		const ids = idsByCollection.get(entry.collection) ?? new Set<string>();

		ids.add(entry.id);
		idsByCollection.set(entry.collection, ids);
	}

	return idsByCollection;
}

function getEntryReferenceIssues(entry: ContentEntry, idsByCollection: Map<string, Set<string>>) {
	const references: Array<EntryReference> = [];

	collectEntryReferences(entry.data, '', references);

	const issues: Array<ReferenceIssue> = [];

	for (const reference of references) {
		const ids = idsByCollection.get(reference.collection);

		// References into collections outside this check's scope are left alone
		if (!ids || ids.has(reference.id)) continue;

		issues.push({ location: entry.filePath ?? entry.id, ...reference });
	}

	return issues;
}

// Astro 7.2.1 checks references itself but only logs, leaving a broken reference to ship
// Checking the declared collection catches a `reference('regions')` that names a theme, which a global id lookup would accept
export function collectReferenceIssues(entries: Array<ContentEntry>) {
	const idsByCollection = getIdsByCollection(entries);

	return entries.flatMap((entry) => getEntryReferenceIssues(entry, idsByCollection));
}

export function validateReferences(entries: Array<ContentEntry>) {
	const issues = collectReferenceIssues(entries);

	return toValidationResult(
		issues.map(({ location, field, collection, id }) => ({
			message: `${location}: ${field} references "${id}", missing from "${collection}"`,
		})),
		{
			pass: 'Entry references valid',
			fail: `Found ${issues.length.toString()} broken reference(s)`,
		},
	);
}
