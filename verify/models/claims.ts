export interface ModelClaims {
	// Rules that break today, kept running until each bug is fixed or settled, then moved to holds
	findings: Array<{ isTemporal?: boolean; rule: string }>;
	holds: Array<string>;
	mutants: Array<{ mutant: string; replace: string; rule: string }>;
	properties: Array<string>;
}

export const claims = {
	atlas: {
		findings: [],
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
			{ mutant: 'SwapKeepsTheFlag', replace: 'ArrivalFlag', rule: 'ModeRemembered' },
			{ mutant: 'CloseOutlivesTheRestore', replace: 'RestoredClosing', rule: 'ModeRemembered' },
		],
		properties: [],
	},
	'map-scope': {
		findings: [],
		holds: ['TypeOK', 'LocationKeepsOrClearsTheScope', 'ScopeHeldWhileOff', 'ScopeOnWhenAsked'],
		mutants: [
			{
				mutant: 'FailureForgetsThePending',
				replace: 'FailedFetch',
				rule: 'LocationKeepsOrClearsTheScope',
			},
			{
				mutant: 'ResolveForgetsTheEarlier',
				replace: 'ResolveScope',
				rule: 'LocationKeepsOrClearsTheScope',
			},
			{
				mutant: 'EveryLocationKeepsTheScope',
				replace: 'KeepsTheScope',
				rule: 'LocationKeepsOrClearsTheScope',
			},
			{ mutant: 'TheToggleIgnoresThePending', replace: 'CanSwitch', rule: 'ScopeHeldWhileOff' },
			{ mutant: 'OffScopeStillDecides', replace: 'DecidesTheScope', rule: 'ScopeHeldWhileOff' },
			{ mutant: 'ResyncReappliesTheView', replace: 'IsSameView', rule: 'ScopeHeldWhileOff' },
			{ mutant: 'MapForgetsTheRestore', replace: 'ScopeRestored', rule: 'ScopeOnWhenAsked' },
		],
		properties: [],
	},
} satisfies Record<string, ModelClaims>;
