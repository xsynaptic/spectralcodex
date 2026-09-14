import { z } from 'zod';

export const WebmentionPropertyEnum = {
	Bookmark: 'bookmark-of',
	Like: 'like-of',
	Mention: 'mention-of',
	Reply: 'in-reply-to',
	Repost: 'repost-of',
	Rsvp: 'rsvp',
} as const;

const WebmentionAuthorSchema = z.looseObject({
	name: z.string().nullable().optional(),
	photo: z.string().nullable().optional(),
	url: z.string().nullable().optional(),
});

const WebmentionContentSchema = z.looseObject({
	html: z.string().nullable().optional(),
	text: z.string().nullable().optional(),
});

// `published` is author-supplied and untrusted; ordering uses `wm-received`
export const WebmentionSchema = z.looseObject({
	author: WebmentionAuthorSchema.nullable().optional(),
	content: WebmentionContentSchema.nullable().optional(),
	published: z.string().nullable().optional(),
	'wm-id': z.number(),
	'wm-private': z.boolean().optional(),
	'wm-property': z.enum(WebmentionPropertyEnum),
	'wm-received': z.string(),
	'wm-source': z.string(),
	'wm-target': z.string(),
});

export type Webmention = z.infer<typeof WebmentionSchema>;
