import type { LocationStatus } from '@spectralcodex/shared/map';

import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { createStore } from 'zustand';

import type { MapFeaturesRule } from '#types.ts';

export type MapDataConfigurableState = Pick<
	MapDataState,
	| 'entryQualityFilter'
	| 'hoveredId'
	| 'isCanvasInteractive'
	| 'isFilterOpen'
	| 'isObjectiveFilterEnabled'
	| 'languages'
	| 'mapFeaturesRule'
	| 'objectiveFilter'
	| 'ratingFilter'
	| 'selectedId'
	| 'statusFilter'
>;

export interface MapDataStore extends MapDataState {
	actions: {
		hideAllStatusFilter: () => void;
		setCanvasInteractive: (isCanvasInteractive: boolean) => void;
		setCanvasLoading: (isCanvasLoading: boolean) => void;
		setClickedId: (clickedId: string | undefined) => void;
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

type DOMCoordinates = Pick<DOMRect, 'x' | 'y'>;

interface MapDataState {
	// Set by a user's click only, so programmatic selections stay out of analytics
	clickedId: string | undefined;
	entryQualityFilter: number;
	filterPosition: DOMCoordinates | undefined;
	hoveredId: string | undefined;
	isCanvasInteractive: boolean;
	isCanvasLoading: boolean;
	isFilterOpen: boolean;
	isObjectiveFilterEnabled: boolean;
	isPopupVisible: boolean;
	languages: Array<string>;
	mapFeaturesRule: MapFeaturesRule | undefined;
	objectiveFilter: number;
	ratingFilter: number;
	selectedId: string | undefined;
	statusFilter: Array<LocationStatus>;
}

const defaultMapDataState = {
	clickedId: undefined,
	entryQualityFilter: 1,
	filterPosition: undefined,
	hoveredId: undefined,
	isCanvasInteractive: true,
	isCanvasLoading: true,
	isFilterOpen: false,
	isObjectiveFilterEnabled: false,
	isPopupVisible: true,
	languages: ['en'],
	mapFeaturesRule: undefined,
	objectiveFilter: 1,
	ratingFilter: 1,
	selectedId: undefined,
	statusFilter: [],
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
				hideAllStatusFilter: () => {
					setAndClearSelection({ statusFilter: Object.values(LocationStatusEnum) });
				},
				setCanvasInteractive: (isCanvasInteractive) => {
					set({ isCanvasInteractive });
				},
				setCanvasLoading: (isCanvasLoading) => {
					set({ isCanvasLoading });
				},
				setClickedId: (clickedId) => {
					set({ clickedId });
				},
				setEntryQualityFilter: (entryQualityFilter) => {
					setAndClearSelection({ entryQualityFilter });
				},
				setFilterOpen: (isFilterOpen) => {
					setAndClearSelection({ isFilterOpen });
				},
				setFilterPosition: (filterPosition) => {
					set({ filterPosition });
				},
				setHoveredId: (hoveredId) => {
					set({ hoveredId });
				},
				setLanguages: (languages) => {
					set({ languages });
				},
				setObjectiveFilter: (objectiveFilter) => {
					setAndClearSelection({ objectiveFilter });
				},
				setPopupVisible: (isPopupVisible) => {
					set({ isPopupVisible });
				},
				setRatingFilter: (ratingFilter) => {
					setAndClearSelection({ ratingFilter });
				},
				setSelectedId: (selectedId) => {
					// A selection takes the filter panel's place; clearing one leaves the panel as it is
					set({
						selectedId,
						...(selectedId === undefined ? { isPopupVisible: true } : { isFilterOpen: false }),
					});
				},
				setStatusFilter: (statusFilter) => {
					setAndClearSelection({ statusFilter });
				},
				showAllStatusFilter: () => {
					setAndClearSelection({ statusFilter: [] });
				},
				toggleStatusFilter: (status) => {
					const statusFilter = get().statusFilter;

					setAndClearSelection({
						statusFilter: statusFilter.includes(status)
							? statusFilter.filter((statusFiltered) => statusFiltered !== status)
							: [...statusFilter, status],
					});
				},
			},
		};
	});
}
