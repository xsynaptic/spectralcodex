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
