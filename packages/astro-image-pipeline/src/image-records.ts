import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { OpenGraphCard } from '#open-graph-cards.ts';

import { formatList } from '#format.ts';

interface OpenGraphCardRecord {
	card: OpenGraphCard;
	kind: 'open-graph-card';
	name: string;
}

interface RenditionRecord {
	name: string;
	sourcePath: string;
}

type ImageRecord = OpenGraphCardRecord | RenditionRecord;

interface RecordedValues {
	conflicts: Map<string, Set<string>>;
	values: Map<string, string>;
}

async function listRecordFiles(recordsPath: string) {
	try {
		const entries = await fs.readdir(recordsPath);

		return entries
			.filter((entry) => entry.endsWith('.ndjson'))
			.toSorted((first, second) => first.localeCompare(second));
	} catch {
		return [];
	}
}

function createRecordedValues(): RecordedValues {
	return { conflicts: new Map(), values: new Map() };
}

function addRecordedValue(recorded: RecordedValues, name: string, value: string) {
	const existing = recorded.values.get(name);

	if (existing === undefined) {
		recorded.values.set(name, value);
		return;
	}

	if (existing === value) return;

	const conflict = recorded.conflicts.get(name) ?? new Set([existing]);

	recorded.conflicts.set(name, conflict.add(value));
}

function sortByName<Value>(entries: Iterable<[string, Value]>) {
	return new Map([...entries].toSorted(([first], [second]) => first.localeCompare(second)));
}

function describeConflicts(renditions: RecordedValues, cards: RecordedValues) {
	const messages: Array<string> = [];

	if (renditions.conflicts.size > 0) {
		const conflicts = [...renditions.conflicts].map(
			([name, sourcePaths]) => `${name} (${[...sourcePaths].join(', ')})`,
		);

		messages.push(
			`${String(conflicts.length)} image names were recorded from more than one source:\n${formatList(conflicts.toSorted((first, second) => first.localeCompare(second)))}`,
		);
	}

	if (cards.conflicts.size > 0) {
		messages.push(
			`${String(cards.conflicts.size)} OpenGraph cards were recorded with different input:\n${formatList([...cards.conflicts.keys()].toSorted((first, second) => first.localeCompare(second)))}`,
		);
	}

	return messages;
}

export async function resetImageRecords(recordsPath: string) {
	const buildRecordsPath = path.join(recordsPath, randomUUID());

	await fs.rm(recordsPath, { force: true, recursive: true });
	await fs.mkdir(buildRecordsPath, { recursive: true });

	return buildRecordsPath;
}

export async function readImageRecords(recordsPath: string) {
	const renditions = createRecordedValues();
	const cards = createRecordedValues();

	const recordFiles = await listRecordFiles(recordsPath);

	for (const recordFile of recordFiles) {
		const text = await fs.readFile(path.join(recordsPath, recordFile), 'utf8');

		for (const line of text.split('\n')) {
			if (line === '') continue;

			const record = JSON.parse(line) as ImageRecord;

			if ('kind' in record) {
				addRecordedValue(cards, record.name, JSON.stringify(record.card));
			} else {
				addRecordedValue(renditions, record.name, record.sourcePath);
			}
		}
	}

	const messages = describeConflicts(renditions, cards);

	if (messages.length > 0) throw new Error(messages.join('\n'));

	return {
		cards: sortByName(
			[...cards.values].map(([name, value]): [string, OpenGraphCard] => [
				name,
				JSON.parse(value) as OpenGraphCard,
			]),
		),
		renditions: sortByName(renditions.values),
	};
}
