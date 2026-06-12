import { wrapCjk } from '@xsynaptic/satteri-wrap-cjk';
import { markdownToHtml } from 'satteri';

// Render a short markdown string (descriptions, notices, teasers) to inline HTML
// CJK wrapping is plugged into the parser; stripping or sanitizing is left to callers that need it
const cache = new Map<string, string>();

export function renderMarkdownInline(input: string): string {
	const cached = cache.get(input);
	if (cached !== undefined) return cached;

	const { html } = markdownToHtml(input, {
		features: { smartPunctuation: true },
		hastPlugins: [wrapCjk({ value: 'cjk' })],
	});
	const result = html.trim();

	cache.set(input, result);
	return result;
}
