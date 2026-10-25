import type * as NodeFs from 'node:fs';

export const imageRecordsVariable = 'XSYNAPTIC_IMAGE_RECORDS';

interface ImageRecorder {
	descriptor: number;
	directory: string;
	fs: typeof NodeFs;
	sources: Map<string, string>;
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

	return { descriptor, directory, fs, sources: new Map() };
}

export function recordImageName(name: string, sourcePath: string) {
	if (typeof process === 'undefined') return;

	const directory = process.env[imageRecordsVariable];

	if (!directory) return;

	if (recorder?.directory !== directory) {
		if (recorder) recorder.fs.closeSync(recorder.descriptor);

		recorder = openRecorder(directory);
	}

	if (recorder.sources.get(name) === sourcePath) return;

	recorder.sources.set(name, sourcePath);
	recorder.fs.writeSync(recorder.descriptor, `${JSON.stringify({ name, sourcePath })}\n`);
}
