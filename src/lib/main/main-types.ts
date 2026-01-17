import type { CollectionKey } from "astro:content";

import type { MultilingualContent } from "#lib/i18n/i18n-types.ts";

/**
 * Menu
 */
export interface MenuItem {
	collection?: CollectionKey | undefined;
	title: string;
	titleMultilingual?: MultilingualContent | undefined;
	url: string;
	rel?: string | undefined;
	ancestor?: string | undefined;
	children?: Array<MenuItem>;
}

/**
 * Mode manager
 */
export const ModeTypeEnum = {
	Auto: 'auto',
	Dark: 'dark',
	Light: 'light',
} as const;

export type ModeGeneralType = (typeof ModeTypeEnum)[keyof typeof ModeTypeEnum];

export type ModeSystemType = Extract<ModeGeneralType, 'light' | 'dark'>;

export type ModeChangedEvent = CustomEvent<{
	mode: ModeGeneralType;
	defaultMode: ModeGeneralType;
	systemMode: ModeSystemType;
	resolvedMode: ModeSystemType;
}>;
