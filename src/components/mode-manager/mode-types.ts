export const ModeTypeEnum = {
	Auto: 'auto',
	Dark: 'dark',
	Light: 'light',
} as const;

export type ModeChangedEvent = CustomEvent<{
	mode: ModeGeneralType;
	resolvedMode: ModeSystemType;
	systemMode: ModeSystemType;
}>;

export type ModeGeneralType = (typeof ModeTypeEnum)[keyof typeof ModeTypeEnum];

export type ModeSystemType = Extract<ModeGeneralType, 'dark' | 'light'>;
