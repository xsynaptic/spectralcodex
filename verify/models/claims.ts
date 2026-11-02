export interface ModelClaims {
	findings: Array<string>;
	holds: Array<string>;
	mutants: Array<{ mutant: string; replace: string; rule: string }>;
}

export const claims = {
	atlas: {
		findings: ['CloseIsNotLost', 'HalfOnlyOnTallScreens'],
		holds: ['TypeOK', 'SheetOnlyOnPhonePlaces', 'ModeRemembered', 'MapWakesWhenShown'],
		mutants: [
			{ mutant: 'ArrivalIgnoresLayout', replace: 'ArrivalRest', rule: 'SheetOnlyOnPhonePlaces' },
			{ mutant: 'SetFlagForgetsTheTab', replace: 'SetFlag', rule: 'ModeRemembered' },
			{ mutant: 'DirectiveLooksOnce', replace: 'IslandAfter', rule: 'MapWakesWhenShown' },
		],
	},
} satisfies Record<string, ModelClaims>;
