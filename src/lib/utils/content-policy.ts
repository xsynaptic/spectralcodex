export interface ContentPolicy {
	applyOverrides: boolean;
	hideSensitiveLocations: boolean;
}

// Two fields from one condition so call sites name the rule they implement, not the environment
export const contentPolicy = {
	applyOverrides: !import.meta.env.DEV,
	hideSensitiveLocations: !import.meta.env.DEV,
} satisfies ContentPolicy;
