import { navigate } from 'astro:transitions/client';
import { distance } from 'fastest-levenshtein';

interface ContentManifestEntry {
	url: string;
	title: string;
}

interface ScoredEntry extends ContentManifestEntry {
	score: number;
}

const minPathLength = 3;

// Lifts a truncated URL ("/sanwan-yue" for "/sanwan-yuemei-suspension-bridge") above length-similar candidates
const substringBonus = 0.3;

function similarity(a: string, b: string): number {
	const max = Math.max(a.length, b.length);

	if (max === 0) return 1;

	const base = 1 - distance(a, b) / max;
	const bonus = a.includes(b) || b.includes(a) ? substringBonus : 0;

	return Math.min(1, base + bonus);
}

function normalize(pathname: string): string {
	return pathname.replace(/\/+$/, '') || '/';
}

function getOptions(container: HTMLElement) {
	return {
		suggestionsUrl: container.dataset.suggestionsUrl ?? '/content-manifest.json',
		threshold: Number(container.dataset.threshold ?? '0.5'),
		autoRedirectThreshold: Number(container.dataset.autoRedirectThreshold ?? '0.92'),
		maxSuggestions: Number(container.dataset.maxSuggestions ?? '5'),
	};
}

type SuggestionsOptions = ReturnType<typeof getOptions>;

async function fetchManifest(url: string): Promise<Array<ContentManifestEntry> | undefined> {
	const response = await fetch(url);

	if (!response.ok) return;

	return (await response.json()) as Array<ContentManifestEntry>;
}

function scoreEntries(entries: Array<ContentManifestEntry>, current: string): Array<ScoredEntry> {
	return entries
		.map((entry) => ({ ...entry, score: similarity(current, normalize(entry.url)) }))
		.sort((entryA, entryB) => entryB.score - entryA.score);
}

type SuggestionsOutcome =
	{ type: 'redirect'; url: string } | { type: 'list'; items: Array<ScoredEntry> };

function resolveSuggestions({
	entries,
	current,
	options,
}: {
	entries: Array<ContentManifestEntry>;
	current: string;
	options: SuggestionsOptions;
}): SuggestionsOutcome | undefined {
	const scored = scoreEntries(entries, current);
	const best = scored[0];

	if (!best || best.score < options.threshold) return;

	if (best.score >= options.autoRedirectThreshold && normalize(best.url) !== current) {
		return { type: 'redirect', url: best.url };
	}

	return {
		type: 'list',
		items: scored
			.filter((entry) => entry.score >= options.threshold)
			.slice(0, options.maxSuggestions),
	};
}

export async function runNotFoundSuggestions(): Promise<void> {
	const container = document.querySelector<HTMLElement>('#not-found-suggestions');

	if (!container) return;

	const loading = document.querySelector<HTMLElement>('#not-found-loading');

	try {
		const current = normalize(window.location.pathname);

		if (current.length < minPathLength) return;

		const options = getOptions(container);

		const entries = await fetchManifest(options.suggestionsUrl);

		if (!entries) return;

		const outcome = resolveSuggestions({ entries, current, options });

		if (!outcome) return;

		if (outcome.type === 'redirect') {
			void navigate(outcome.url, { history: 'replace' });
			return;
		}

		renderSuggestions(outcome.items);
		container.hidden = false;
	} finally {
		loading?.remove();
	}
}

function renderSuggestions(items: Array<ScoredEntry>): void {
	const list = document.querySelector('#not-found-suggestions-list');

	if (!list) return;

	for (const item of items) {
		const listItem = document.createElement('li');
		const listItemInner = document.createElement('div');
		const link = document.createElement('a');

		link.href = item.url;
		link.className = 'anchor anchor-accent';
		link.textContent = item.title;
		link.dataset.astroHistory = 'replace';

		listItemInner.append(link);
		listItem.append(listItemInner);
		list.append(listItem);
	}
}
