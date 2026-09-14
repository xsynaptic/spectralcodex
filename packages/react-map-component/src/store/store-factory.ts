import type { LocationStatus } from '@spectralcodex/shared/map';

import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { createStore } from 'zustand';

import type { MapScope } from '#types.ts';

type DOMCoordinates = Pick<DOMRect, 'x' | 'y'>;

interface MapDataState {
	entryQualityFilter: number;
	filterPosition: DOMCoordinates | undefined;
	hoveredId: string | undefined;
	isCanvasInteractive: boolean;
	isCanvasLoading: boolean;
	isFilterOpen: boolean;
	isObjectiveFilterEnabled: boolean;
	isPopupVisible: boolean;
	languages: Array<string>;
	objectiveFilter: number;
	ratingFilter: number;
	scope: MapScope | undefined;
	selectedId: string | undefined;
	statusFilter: Array<LocationStatus>;
}

export type MapDataConfigurableState = Pick<
	MapDataState,
	| 'entryQualityFilter'
	| 'hoveredId'
	| 'isCanvasInteractive'
	| 'isFilterOpen'
	| 'isObjectiveFilterEnabled'
	| 'languages'
	| 'objectiveFilter'
	| 'ratingFilter'
	| 'scope'
	| 'selectedId'
	| 'statusFilter'
>;

export interface MapDataStore extends MapDataState {
	actions: {
		hideAllStatusFilter: () => void;
		setCanvasInteractive: (isCanvasInteractive: boolean) => void;
		setCanvasLoading: (isCanvasLoading: boolean) => void;
		setEntryQualityFilter: (entryQualityFilter: number) => void;
		setFilterOpen: (isFilterOpen: boolean) => void;
		setFilterPosition: (filterPosition: DOMCoordinates) => void;
		setHoveredId: (hoveredId: string | undefined) => void;
		setLanguages: (languages: Array<string>) => void;
		setObjectiveFilter: (objectiveFilter: number) => void;
		setPopupVisible: (isPopupVisible: boolean) => void;
		setRatingFilter: (ratingFilter: number) => void;
		setSelectedId: (selectedId: string | undefined) => void;
		setStatusFilter: (statusFilter: Array<LocationStatus>) => void;
		showAllStatusFilter: () => void;
		toggleStatusFilter: (status: LocationStatus) => void;
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
