import type { FC } from 'react';

import { useSourceDataQuery } from '#data/data-source.tsx';
import { useIsMapCanvasLoading } from '#store/store.ts';

export const MapCanvasLoading: FC<{ isSelectionPending: boolean }> = function MapCanvasLoading({
	isSelectionPending,
}) {
	const { isLoading: isSourceDataLoading } = useSourceDataQuery();
	const isCanvasLoading = useIsMapCanvasLoading();

	const isLoading = isCanvasLoading || isSourceDataLoading || isSelectionPending;

	return (
		<div className="map-canvas-loading">
			<div className="map-loading-animation" style={{ opacity: isLoading ? 1 : 0 }} />
		</div>
	);
};
