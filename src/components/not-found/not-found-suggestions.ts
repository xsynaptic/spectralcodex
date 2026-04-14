import { distance } from 'fastest-levenshtein';

interface ContentManifestEntry {
	url: string;
	title: string;
}

interface ScoredEntry extends ContentManifestEntry {
	score: number;
}

const minPathLength = 3;

// Bonus applied when one string is a substring of the other, so that truncated
// URLs (e.g. "/sanwan-yue" for "/sanwan-yuemei-suspension-bridge") rank above
// length-similar but less relevant candidates.
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

export async function runNotFoundSuggestions(): Promise<void> {
	const container = document.querySelector<HTMLElement>('#not-found-suggestions');

	if (!container) return;

	const current = normalize(window.location.pathname);

	if (current.length < minPathLength) return;

	const suggestionsUrl = container.dataset.suggestionsUrl ?? '/content-manifest.json';
	const threshold = Number.parseFloat(container.dataset.threshold ?? '0.5');
	const autoRedirectThreshold = Number.parseFloat(
		container.dataset.autoRedirectThreshold ?? '0.92',
	);
	const maxSuggestions = Number.parseInt(container.dataset.maxSuggestions ?? '5', 10);

	const response = await fetch(suggestionsUrl);
	if (!response.ok) return;

	const entries = (await response.json()) as Array<ContentManifestEntry>;

	const scored: Array<ScoredEntry> = entries
		.map((entry) => ({ ...entry, score: similarity(current, normalize(entry.url)) }))
		.sort((entryA, entryB) => entryB.score - entryA.score);

	const best = scored[0];
	if (!best || best.score < threshold) return;

	if (best.score >= autoRedirectThreshold && best.score < 1) {
		window.location.replace(best.url);
		return;
	}

	const top = scored.filter((entry) => entry.score >= threshold).slice(0, maxSuggestions);

	renderSuggestions(top);
	container.hidden = false;
}

function renderSuggestions(items: Array<ScoredEntry>): void {
	const list = document.querySelector('#not-found-suggestions-list');

	if (!list) return;

	for (const item of items) {
		const listItem = document.createElement('li');
		const listItemInner = document.createElement('div');
		const link = document.createElement('a');

		link.href = item.url;
		link.className = 'l-all l-accent l-dark';
		link.textContent = item.title;

		listItemInner.append(link);
		listItem.append(listItemInner);
		list.append(listItem);
	}
}
