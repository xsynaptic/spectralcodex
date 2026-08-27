import type { Webmention } from '@spectralcodex/shared/schemas';

import { WebmentionPropertyEnum, WebmentionSchema } from '@spectralcodex/shared/schemas';
import { CONTENT_DATA_PATH } from 'astro:env/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Bridgy backfeeds our own thread continuations as replies; they are not third-party commentary
const selfAuthorUrls = new Set([
	'https://bsky.app/profile/spectralcodex.com',
	'https://indieweb.social/@spectralcodex',
]);

interface WebmentionReply {
	id: number;
	authorName: string;
	authorUrl: string | undefined;
	sourceUrl: string;
	dateReceived: Date;
	text: string | undefined;
}

interface WebmentionsSummary {
	likeCount: number;
	repostCount: number;
	bookmarkCount: number;
	replies: Array<WebmentionReply>;
}

function isSelfAuthored(mention: Webmention) {
	const authorUrl = mention.author?.url?.trim().toLowerCase().replace(/\/+$/, '');

	return !!authorUrl && selfAuthorUrls.has(authorUrl);
}

// Origin and trailing slash vary between senders; the path alone is the identity
function normalizePathname(input: string) {
	const pathname = URL.canParse(input) ? new URL(input).pathname : input;

	return pathname.replace(/\/+$/, '') || '/';
}

async function loadWebmentions() {
	const filePath = path.join(process.cwd(), CONTENT_DATA_PATH, '..', 'data', 'webmentions.jsonl');

	try {
		const fileContents = await readFile(filePath, 'utf8');
		const mentions: Array<Webmention> = [];

		for (const line of fileContents.split('\n')) {
			if (line.trim() === '') continue;

			const result = WebmentionSchema.safeParse(JSON.parse(line));

			if (result.success) mentions.push(result.data);
		}

		return mentions;
	} catch (error) {
		const isNotFound = error instanceof Error && 'code' in error && error.code === 'ENOENT';

		if (isNotFound) {
			console.warn(`[Webmentions] Not found: ${filePath} (run pnpm webmentions to generate)`);
			return [];
		}

		throw error;
	}
}

async function createWebmentionsFunction() {
	const mentions = await loadWebmentions();

	const mentionsByPathname = new Map<string, Array<Webmention>>();

	for (const mention of mentions) {
		if (isSelfAuthored(mention)) continue;

		const pathname = normalizePathname(mention['wm-target']);
		const group = mentionsByPathname.get(pathname);

		if (group) {
			group.push(mention);
			continue;
		}

		mentionsByPathname.set(pathname, [mention]);
	}

	return function getWebmentions(pathnames: Array<string>): WebmentionsSummary | undefined {
		const matched = pathnames.flatMap(
			(pathname) => mentionsByPathname.get(normalizePathname(pathname)) ?? [],
		);

		if (matched.length === 0) return undefined;

		const summary: WebmentionsSummary = {
			likeCount: 0,
			repostCount: 0,
			bookmarkCount: 0,
			replies: [],
		};

		for (const mention of matched) {
			switch (mention['wm-property']) {
				case WebmentionPropertyEnum.Like: {
					summary.likeCount += 1;
					break;
				}
				case WebmentionPropertyEnum.Repost: {
					summary.repostCount += 1;
					break;
				}
				case WebmentionPropertyEnum.Bookmark: {
					summary.bookmarkCount += 1;
					break;
				}
				case WebmentionPropertyEnum.Reply:
				case WebmentionPropertyEnum.Mention: {
					const reply = toReply(mention);

					if (reply) summary.replies.push(reply);
					break;
				}
				default: {
					break;
				}
			}
		}

		summary.replies.sort(
			(replyA, replyB) => replyA.dateReceived.getTime() - replyB.dateReceived.getTime(),
		);

		return summary;
	};
}

// Senders that publish no h-card still identify themselves by domain
function getSourceHostname(sourceUrl: string) {
	if (!URL.canParse(sourceUrl)) return;

	return new URL(sourceUrl).hostname.replace(/^www\./, '');
}

function trimToUndefined(value: string | null | undefined): string | undefined {
	const trimmed = value?.trim();

	return trimmed === '' ? undefined : trimmed;
}

function toReply(mention: Webmention): WebmentionReply | undefined {
	const authorName =
		trimToUndefined(mention.author?.name) ?? getSourceHostname(mention['wm-source']);

	if (!authorName) return undefined;

	return {
		id: mention['wm-id'],
		authorName,
		authorUrl: trimToUndefined(mention.author?.url),
		sourceUrl: mention['wm-source'],
		dateReceived: new Date(mention['wm-received']),
		text: trimToUndefined(mention.content?.text),
	};
}

let webmentionsFunction: ReturnType<typeof createWebmentionsFunction> | undefined;

export async function getWebmentionsFunction() {
	if (!webmentionsFunction) {
		webmentionsFunction = createWebmentionsFunction();
	}
	return webmentionsFunction;
}
