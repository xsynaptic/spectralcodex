const moveViewportShare = 0.2;

export function getSheetDragOffset({ deltaY, restPx }: { deltaY: number; restPx: number }) {
	const maxPx = restPx > 0 ? restPx : Infinity;

	return Math.min(maxPx, Math.max(0, restPx + deltaY));
}

export function getSheetRelease({
	eventType,
	isDragged,
	travelPx,
	viewportHeight,
}: {
	eventType: string;
	isDragged: boolean;
	travelPx: number;
	viewportHeight: number;
}) {
	if (eventType !== 'pointerup') return 'settle';
	if (!isDragged) return 'toggle';

	return travelPx >= viewportHeight * moveViewportShare ? 'toggle' : 'settle';
}
