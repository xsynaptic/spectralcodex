import chalk from 'chalk';

import type { DataStoreCollections, DataStoreEntry } from '../shared/data-store';

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

function getEntriesByCollection(collections: DataStoreCollections, collectionNames: Array<string>) {
	const entriesByCollection = new Map<string, Map<string, DataStoreEntry>>();

	for (const name of collectionNames) {
		const collection = collections.get(name);

		if (!collection) throw new Error(`Unknown collection: "${name}"`);

		entriesByCollection.set(name, collection);
	}

	return entriesByCollection;
}

function getEntryReferenceIssues(
	entry: DataStoreEntry,
	entriesByCollection: Map<string, Map<string, DataStoreEntry>>,
) {
	const references: Array<EntryReference> = [];

	collectEntryReferences(entry.data, '', references);

	const issues: Array<ReferenceIssue> = [];

	for (const reference of references) {
		const target = entriesByCollection.get(reference.collection);

		// References into collections outside this check's scope are left alone
		if (!target || target.has(reference.id)) continue;

		issues.push({ location: entry.filePath ?? entry.id, ...reference });
	}

	return issues;
}

// Astro 7.2.1 checks references itself but only logs, leaving a broken reference to ship
// Checking the declared collection catches a `reference('regions')` that names a theme, which a global id lookup would accept
export function collectReferenceIssues(
	collections: DataStoreCollections,
	collectionNames: Array<string>,
) {
	const entriesByCollection = getEntriesByCollection(collections, collectionNames);

	const issues: Array<ReferenceIssue> = [];

	for (const collection of entriesByCollection.values()) {
		for (const entry of collection.values()) {
			issues.push(...getEntryReferenceIssues(entry, entriesByCollection));
		}
	}

	return issues;
}

export function checkReferences(collections: DataStoreCollections, collectionNames: Array<string>) {
	const issues = collectReferenceIssues(collections, collectionNames);

	if (issues.length === 0) {
		console.log(chalk.green('✓ Entry references valid'));
		return true;
	}

	for (const { location, field, collection, id } of issues) {
		console.log(
			chalk.red(`❌ ${location}: ${field} references "${id}", missing from "${collection}"`),
		);
	}

	console.log(chalk.yellow(`⚠️  Found ${issues.length.toString()} broken reference(s)`));

	return false;
}
