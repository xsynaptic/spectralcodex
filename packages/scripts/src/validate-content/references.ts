import type { ContentEntry } from '#shared/astro-content.ts';
import type { EntryReference, ReferenceIssue } from '#validate-content/validation-result.ts';

import { toReferenceValidationResult } from '#validate-content/validation-result.ts';

interface ReferenceOptions {
	skipCollections?: Array<string>;
}

// Astro 7.2.1 checks references itself but only logs, leaving a broken reference to ship
// Checking the declared collection catches a `reference('regions')` that names a theme, which a global id lookup would accept
export function collectReferenceIssues(
	entries: Array<ContentEntry>,
	{ skipCollections = [] }: ReferenceOptions = {},
) {
	const idsByCollection = getIdsByCollection(entries);
	const skipped = new Set(skipCollections);

	return entries.flatMap((entry) => getEntryReferenceIssues(entry, idsByCollection, skipped));
}

export function validateReferences(entries: Array<ContentEntry>, options: ReferenceOptions = {}) {
	const issues = collectReferenceIssues(entries, options);

	return toReferenceValidationResult(issues, {
		fail: `Found ${issues.length.toString()} broken reference(s)`,
		pass: 'Entry references valid',
	});
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

// A collection missing from the checked set is itself a fault, so a skip has to be named
function getEntryReferenceIssues(
	entry: ContentEntry,
	idsByCollection: Map<string, Set<string>>,
	skipCollections: Set<string>,
) {
	const references: Array<EntryReference> = [];

	collectEntryReferences(entry.data, '', references);

	const issues: Array<ReferenceIssue> = [];

	for (const reference of references) {
		if (skipCollections.has(reference.collection)) continue;
		if (idsByCollection.get(reference.collection)?.has(reference.id)) continue;

		issues.push({ location: entry.filePath ?? entry.id, ...reference });
	}

	return issues;
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

function toEntryReference(
	record: Record<string, unknown>,
	field: string,
): EntryReference | undefined {
	if (typeof record.collection !== 'string' || typeof record.id !== 'string') return undefined;

	return { field, collection: record.collection, id: record.id };
}
