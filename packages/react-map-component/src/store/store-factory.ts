import type { LocationStatus } from '@spectralcodex/shared/map';
import type { CSSProperties } from 'react';

import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { createStore } from 'zustand';

type DOMCoordinates = Pick<DOMRect, 'x' | 'y'>;

interface MapDataState {
	selectedId: string | undefined;
	hoveredId: string | undefined;
	popupVisible: boolean;
	canvasCursor: NonNullable<CSSProperties['cursor']>;
	canvasInteractive: boolean;
	canvasLoading: boolean;
	filterPosition: DOMCoordinates | undefined;
	filterOpen: boolean;
	statusFilter: Array<LocationStatus>;
	qualityFilter: number;
	ratingFilter: number;
	objectiveFilter: number;
	showObjectiveFilter: boolean;
	languages: Array<string>;
}

export type MapDataConfigurableState = Pick<
	MapDataState,
	| 'selectedId'
	| 'hoveredId'
	| 'canvasCursor'
	| 'canvasInteractive'
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
		setPopupVisible: (popupVisible: boolean) => void;
		setHoveredId: (hoveredId: string | undefined) => void;
		setCanvasCursor: (canvasCursor: NonNullable<CSSProperties['cursor']>) => void;
		setCanvasInteractive: (canvasInteractive: boolean) => void;
		setCanvasLoading: (canvasLoading: boolean) => void;
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

const defaultMapDataState = {
	selectedId: undefined,
	hoveredId: undefined,
	popupVisible: true,
	canvasCursor: 'grab',
	canvasInteractive: true,
	canvasLoading: true,
	filterPosition: undefined,
	filterOpen: false,
	statusFilter: [],
	qualityFilter: 1,
	ratingFilter: 1,
	objectiveFilter: 1,
	showObjectiveFilter: false,
	languages: ['en'],
} satisfies MapDataState;

export function createMapStore(initialState?: Partial<MapDataConfigurableState>) {
	const state: MapDataState = { ...defaultMapDataState, ...initialState };

	return createStore<MapDataStore>()((set, get) => {
		// filter interactions clear the active selection so its popup doesn't linger
		const setAndClearSelection = (partial: Partial<MapDataState>) => {
			set({ selectedId: undefined, ...partial });
		};

		return {
			...state,
			actions: {
				setSelectedId: (selectedId) => {
					set({
						selectedId,
						filterOpen: false,
						...(selectedId === undefined ? { popupVisible: true } : {}),
					});
				},
				setPopupVisible: (popupVisible) => {
					set({ popupVisible });
				},
				setHoveredId: (hoveredId) => {
					set({ hoveredId });
				},
				setCanvasCursor: (canvasCursor) => {
					set({ canvasCursor });
				},
				setCanvasInteractive: (canvasInteractive) => {
					set({ canvasInteractive });
				},
				setCanvasLoading: (canvasLoading) => {
					set({ canvasLoading });
				},
				setFilterPosition: (filterPosition) => {
					set({ filterPosition });
				},
				setFilterOpen: (filterOpen) => {
					setAndClearSelection({ filterOpen });
				},
				setStatusFilter: (statusFilter) => {
					setAndClearSelection({ statusFilter });
				},
				toggleStatusFilter: (status) => {
					const statusFilter = get().statusFilter;

					setAndClearSelection({
						statusFilter: statusFilter.includes(status)
							? statusFilter.filter((statusFiltered) => statusFiltered !== status)
							: [...statusFilter, status],
					});
				},
				showAllStatusFilter: () => {
					setAndClearSelection({ statusFilter: [] });
				},
				hideAllStatusFilter: () => {
					setAndClearSelection({ statusFilter: Object.values(LocationStatusEnum) });
				},
				setQualityFilter: (qualityFilter) => {
					setAndClearSelection({ qualityFilter });
				},
				setRatingFilter: (ratingFilter) => {
					setAndClearSelection({ ratingFilter });
				},
				setObjectiveFilter: (objectiveFilter) => {
					setAndClearSelection({ objectiveFilter });
				},
				setLanguages: (languages) => {
					set({ languages });
				},
			},
		};
	});
}
