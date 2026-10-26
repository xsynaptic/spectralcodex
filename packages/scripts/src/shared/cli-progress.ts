import {
	endSpinner,
	formatCount,
	formatDuration,
	log,
	startSpinner,
	symbols,
} from '#shared/cli-output.ts';

interface ProgressOptions {
	label: string;
	note?: () => string;
	total: number;
}

interface ProgressSnapshot {
	done: number;
	label: string;
	note?: string;
	perSecond?: number;
	total: number;
}

interface RateSample {
	count: number;
	time: number;
}

const renderIntervalMs = 100;
const plainIntervalMs = 10_000;
const rateWindowMs = 10_000;

export function createRateWindow(windowMs = rateWindowMs) {
	const samples: Array<RateSample> = [];

	return {
		add(count: number, time: number) {
			samples.push({ count, time });

			while (samples.length > 2 && time - (samples[0]?.time ?? time) > windowMs) samples.shift();
		},
		perSecond() {
			const first = samples.at(0);
			const last = samples.at(-1);

			if (!first || !last || last.time <= first.time) return;

			return ((last.count - first.count) * 1000) / (last.time - first.time);
		},
	};
}

function formatRate(perSecond: number) {
	return perSecond >= 10 ? formatCount(Math.round(perSecond)) : perSecond.toFixed(1);
}

export function formatProgressText({ done, label, note, perSecond, total }: ProgressSnapshot) {
	const percent = total === 0 ? 100 : Math.floor((done / total) * 100);
	const parts = [`${label} ${formatCount(done)} / ${formatCount(total)} (${String(percent)}%)`];
	const remaining = total - done;

	if (perSecond !== undefined && perSecond > 0) {
		parts.push(`${formatRate(perSecond)}/s`);

		if (remaining > 0) parts.push(`~${formatDuration((remaining / perSecond) * 1000)} left`);
	}

	if (note) parts.push(note);

	return parts.join(' · ');
}

export function createProgress({ label, note, total }: ProgressOptions) {
	const rateWindow = createRateWindow();
	const startTime = Date.now();
	let done = 0;
	let lastRender = 0;
	let lastPlain = startTime;

	rateWindow.add(0, startTime);

	function getText() {
		const noteText = note?.();
		const perSecond = rateWindow.perSecond();

		return formatProgressText({
			done,
			label,
			total,
			...(noteText ? { note: noteText } : {}),
			...(perSecond === undefined ? {} : { perSecond }),
		});
	}

	const spinner = startSpinner(getText());

	function render() {
		const now = Date.now();

		if (now - lastRender < renderIntervalMs) return;

		lastRender = now;
		rateWindow.add(done, now);

		spinner.text = getText();

		if (spinner.isEnabled || now - lastPlain < plainIntervalMs) return;

		lastPlain = now;
		log.info(spinner.text);
	}

	function finish(symbol: string, text?: string) {
		endSpinner(spinner, symbol, text ?? getText());
	}

	return {
		fail(text?: string) {
			finish(symbols.error, text);
		},
		succeed(text?: string) {
			finish(symbols.success, text);
		},
		tick(count = 1) {
			done += count;
			render();
		},
		warn(text?: string) {
			finish(symbols.warn, text);
		},
	};
}

// A failure leaves the spinner active for `runCommand` to mark as failed
export async function withStatus<Result>(text: string, task: () => Promise<Result>) {
	const spinner = startSpinner(text);
	const result = await task();

	endSpinner(spinner);

	return result;
}

export async function withSpinner<Result>(
	text: string,
	task: () => Promise<Result>,
	describe?: (result: Result) => string,
) {
	const spinner = startSpinner(text);

	try {
		const result = await task();

		endSpinner(spinner, symbols.success, describe?.(result) ?? text);

		return result;
	} catch (error) {
		endSpinner(spinner, symbols.error, text);
		throw error;
	}
}
