import type { CSSProperties } from 'react';

import type { MapPopupData, MapPopupItem, MapSourceData } from '../types';
import type { LocationStatus } from '../types/map-locations';

type DOMCoordinates = Pick<DOMRect, 'x' | 'y'>;

export interface MapDataState {
	// Feature state
	selectedId: string | undefined;
	/** Source */
	sourceData: MapSourceData;
	sourceDataLoading: boolean;
	sourceDataCount: number;
	/** Canvas */
	canvasCursor: NonNullable<CSSProperties['cursor']>;
	canvasInteractive: boolean;
	canvasClusters: boolean | undefined;
	canvasLoading: boolean;
	/** Popup  */
	popupData: MapPopupData;
	popupDataLoading: boolean;
	popupItem: MapPopupItem | undefined;
	/** Filter */
	filterPosition: DOMCoordinates | undefined;
	filterOpen: boolean;
	statusFilter: Array<LocationStatus>;
	qualityFilter: number;
	ratingFilter: number;
	objectiveFilter: number;
	showObjectiveFilter: boolean;
	/** Other */
	languages?: Array<string> | undefined;
}

export type MapDataConfigurableState = Pick<
	MapDataState,
	| 'selectedId'
	| 'sourceData'
	| 'popupData'
	| 'canvasCursor'
	| 'canvasInteractive'
	| 'canvasClusters'
	| 'filterOpen'
	| 'statusFilter'
	| 'qualityFilter'
	| 'ratingFilter'
	| 'objectiveFilter'
	| 'showObjectiveFilter'
	| 'languages'
>;

export interface MapDataStore extends MapDataState {
	actions: {
		setSelectedId: (selectedId: string | undefined) => void;
		setSourceData: (sourceData: MapSourceData) => void;
		setSourceDataLoading: (sourceDataLoading: boolean) => void;
		setCanvasCursor: (canvasCursor: NonNullable<CSSProperties['cursor']>) => void;
		setCanvasInteractive: (canvasInteractive: boolean) => void;
		setCanvasLoading: (canvasLoading: boolean) => void;
		setCanvasClusters: (canvasClusters: boolean | undefined) => void;
		setPopupData: (popupData: MapPopupData) => void;
		setPopupDataLoading: (popupDataLoading: boolean) => void;
		setFilterPosition: (filterPosition: DOMCoordinates) => void;
		setFilterOpen: (filterOpen: boolean) => void;
		setStatusFilter: (statusFilter: Array<LocationStatus>) => void;
		toggleStatusFilter: (status: LocationStatus) => void;
		showAllStatusFilter: () => void;
		hideAllStatusFilter: () => void;
		setQualityFilter: (qualityFilter: number) => void;
		setRatingFilter: (ratingFilter: number) => void;
		setObjectiveFilter: (objectiveFilter: number) => void;
		setLanguages: (languages: Array<string>) => void;
	};
}
