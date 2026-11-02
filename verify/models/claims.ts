export interface ModelClaims {
	holds: Array<string>;
	mutants: Array<{ mutant: string; replace: string; rule: string }>;
	properties: Array<string>;
}

export const claims = {
	atlas: {
		holds: [
			'TypeOK',
			'SheetOnlyOnPhonePlaces',
			'HalfOnlyOnTallScreens',
			'ModeRemembered',
			'MapWakesWhenShown',
		],
		mutants: [
			{ mutant: 'ArrivalIgnoresLayout', replace: 'ArrivalRest', rule: 'SheetOnlyOnPhonePlaces' },
			{ mutant: 'SetFlagForgetsTheTab', replace: 'SetFlag', rule: 'ModeRemembered' },
			{ mutant: 'SettleIgnoresTheGate', replace: 'LandedRest', rule: 'HalfOnlyOnTallScreens' },
			{ mutant: 'DirectiveLooksOnce', replace: 'IslandAfter', rule: 'MapWakesWhenShown' },
			{ mutant: 'SwapKeepsTheFlag', replace: 'ArrivalFlag', rule: 'CloseIsNotLost' },
		],
		properties: ['CloseIsNotLost'],
	},
} satisfies Record<string, ModelClaims>;
