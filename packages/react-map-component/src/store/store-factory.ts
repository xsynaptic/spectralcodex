import type { LocationStatus } from '@spectralcodex/shared/map';

import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { createStore } from 'zustand';

import type { MapScope } from '../types';

type DOMCoordinates = Pick<DOMRect, 'x' | 'y'>;

interface MapDataState {
	selectedId: string | undefined;
	hoveredId: string | undefined;
	isPopupVisible: boolean;
	isCanvasInteractive: boolean;
	isCanvasLoading: boolean;
	filterPosition: DOMCoordinates | undefined;
	isFilterOpen: boolean;
	statusFilter: Array<LocationStatus>;
	entryQualityFilter: number;
	ratingFilter: number;
	objectiveFilter: number;
	isObjectiveFilterEnabled: boolean;
	languages: Array<string>;
	scope: MapScope | undefined;
}

export type MapDataConfigurableState = Pick<
	MapDataState,
	| 'selectedId'
	| 'hoveredId'
	| 'isCanvasInteractive'
	| 'isFilterOpen'
	| 'statusFilter'
	| 'entryQualityFilter'
	| 'ratingFilter'
	| 'objectiveFilter'
	| 'isObjectiveFilterEnabled'
	| 'languages'
	| 'scope'
>;

export interface MapDataStore extends MapDataState {
	actions: {
		setSelectedId: (selectedId: string | undefined) => void;
		setPopupVisible: (isPopupVisible: boolean) => void;
		setHoveredId: (hoveredId: string | undefined) => void;
		setCanvasInteractive: (isCanvasInteractive: boolean) => void;
		setCanvasLoading: (isCanvasLoading: boolean) => void;
		setFilterPosition: (filterPosition: DOMCoordinates) => void;
		setFilterOpen: (isFilterOpen: boolean) => void;
		setStatusFilter: (statusFilter: Array<LocationStatus>) => void;
		toggleStatusFilter: (status: LocationStatus) => void;
		showAllStatusFilter: () => void;
		hideAllStatusFilter: () => void;
		setEntryQualityFilter: (entryQualityFilter: number) => void;
		setRatingFilter: (ratingFilter: number) => void;
		setObjectiveFilter: (objectiveFilter: number) => void;
		setLanguages: (languages: Array<string>) => void;
	};
}

const defaultMapDataState = {
	selectedId: undefined,
	hoveredId: undefined,
	isPopupVisible: true,
	isCanvasInteractive: true,
	isCanvasLoading: true,
	filterPosition: undefined,
	isFilterOpen: false,
	statusFilter: [],
	entryQualityFilter: 1,
	ratingFilter: 1,
	objectiveFilter: 1,
	isObjectiveFilterEnabled: false,
	languages: ['en'],
	scope: undefined,
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
						isFilterOpen: false,
						...(selectedId === undefined ? { isPopupVisible: true } : {}),
					});
				},
				setPopupVisible: (isPopupVisible) => {
					set({ isPopupVisible });
				},
				setHoveredId: (hoveredId) => {
					set({ hoveredId });
				},
				setCanvasInteractive: (isCanvasInteractive) => {
					set({ isCanvasInteractive });
				},
				setCanvasLoading: (isCanvasLoading) => {
					set({ isCanvasLoading });
				},
				setFilterPosition: (filterPosition) => {
					set({ filterPosition });
				},
				setFilterOpen: (isFilterOpen) => {
					setAndClearSelection({ isFilterOpen });
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
				setEntryQualityFilter: (entryQualityFilter) => {
					setAndClearSelection({ entryQualityFilter });
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
