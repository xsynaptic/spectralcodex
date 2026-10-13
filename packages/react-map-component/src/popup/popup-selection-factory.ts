export interface MapSelectionInput {
	isHosted: boolean;
	isLoading: boolean;
	isTarget: boolean;
	targetCount: number;
	url: string | undefined;
}

// A lone Target is the page being read, so only one of several has a popup of its own
export function hasTargetPopup(targetCount: number) {
	return targetCount > 1;
}

export function getSelectionOutcome({
	isHosted,
	isLoading,
	isTarget,
	targetCount,
	url,
}: MapSelectionInput) {
	if (isTarget) return hasTargetPopup(targetCount) ? 'popup' : 'none';
	if (!isHosted) return 'popup';
	if (isLoading) return 'pending';

	return url ? 'open' : 'popup';
}

export function getSettledClick({
	clickedId,
	isLoading,
	outcome,
	selectedId,
}: {
	clickedId: string | undefined;
	isLoading: boolean;
	outcome: ReturnType<typeof getSelectionOutcome> | undefined;
	selectedId: string | undefined;
}) {
	if (!selectedId || clickedId !== selectedId || isLoading) return;

	return outcome === 'open' ? 'open' : 'popup';
}
