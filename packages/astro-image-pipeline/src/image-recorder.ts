import type * as NodeFs from 'node:fs';

import type { OpenGraphCard } from '#open-graph-cards.ts';

export const imageRecordsVariable = 'XSYNAPTIC_IMAGE_RECORDS';

interface ImageRecorder {
	descriptor: number;
	directory: string;
	fs: typeof NodeFs;
	lines: Set<string>;
}

let recorder: ImageRecorder | undefined;

// node:fs is looked up lazily so the presets entry still loads where it doesn't exist
function openRecorder(directory: string): ImageRecorder {
	const fs = process.getBuiltinModule('node:fs');
	const { threadId } = process.getBuiltinModule('node:worker_threads');
	const descriptor = fs.openSync(
		`${directory}/${String(process.pid)}-${String(threadId)}.ndjson`,
		'a',
	);

	return { descriptor, directory, fs, lines: new Set() };
}

function writeRecord(record: object) {
	if (typeof process === 'undefined') return;

	const directory = process.env[imageRecordsVariable];

	if (!directory) return;

	if (recorder?.directory !== directory) {
		if (recorder) recorder.fs.closeSync(recorder.descriptor);

		recorder = openRecorder(directory);
	}

	const line = JSON.stringify(record);

	if (recorder.lines.has(line)) return;

	recorder.lines.add(line);
	recorder.fs.writeSync(recorder.descriptor, `${line}\n`);
}

export function recordImageName(name: string, sourcePath: string) {
	writeRecord({ name, sourcePath });
}

export function recordOpenGraphCard(name: string, card: OpenGraphCard) {
	writeRecord({ card, kind: 'open-graph-card', name });
}
