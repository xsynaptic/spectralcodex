import type { LocationStatus } from '@spectralcodex/shared/map';

import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { createStore } from 'zustand';

import type { MapFeaturesRule, MapScope } from '#types.ts';

export type MapDataConfigurableState = Pick<
	MapDataState,
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
		setFilterOpen: (isFilterOpen: boolean) => void;
		setFilterPosition: (filterPosition: DOMCoordinates) => void;
		setHoveredId: (hoveredId: string | undefined) => void;
		setLanguages: (languages: Array<string>) => void;
		setObjectiveFilter: (objectiveFilter: number) => void;
		setPopupVisible: (isPopupVisible: boolean) => void;
		setRatingFilter: (ratingFilter: number) => void;
		setScope: (
			scope: MapScope | undefined,
			isScopeEnabled: boolean,
			scopeViewKey: string | undefined,
		) => void;
		setScopeEnabled: (isScopeEnabled: boolean) => void;
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
	filterPosition: DOMCoordinates | undefined;
	hoveredId: string | undefined;
	isCanvasInteractive: boolean;
	isCanvasLoading: boolean;
	isFilterOpen: boolean;
	isObjectiveFilterEnabled: boolean;
	isPopupVisible: boolean;
	isScopeEnabled: boolean;
	languages: Array<string>;
	mapFeaturesRule: MapFeaturesRule | undefined;
	objectiveFilter: number;
	ratingFilter: number;
	scope: MapScope | undefined;
	// The `data-map-view` string the Scope was last computed from
	scopeViewKey: string | undefined;
	selectedId: string | undefined;
	statusFilter: Array<LocationStatus>;
}

const defaultMapDataState = {
	clickedId: undefined,
	filterPosition: undefined,
	hoveredId: undefined,
	isCanvasInteractive: true,
	isCanvasLoading: true,
	isFilterOpen: false,
	isObjectiveFilterEnabled: false,
	isPopupVisible: true,
	isScopeEnabled: true,
	languages: ['en'],
	mapFeaturesRule: undefined,
	objectiveFilter: 1,
	ratingFilter: 1,
	scope: undefined,
	scopeViewKey: undefined,
	selectedId: undefined,
	statusFilter: [],
} satisfies MapDataState;

export function hasActiveFilter({
	isObjectiveFilterEnabled,
	objectiveFilter,
	ratingFilter,
	statusFilter,
}: Pick<
	MapDataState,
	'isObjectiveFilterEnabled' | 'objectiveFilter' | 'ratingFilter' | 'statusFilter'
>) {
	if (statusFilter.length > 0 || ratingFilter > 1) return true;

	return isObjectiveFilterEnabled && objectiveFilter > 1;
}

export function createMapStore(initialState?: Partial<MapDataConfigurableState>) {
	const state: MapDataState = { ...defaultMapDataState, ...initialState };

	return createStore<MapDataStore>()((set, get) => {
		// filter interactions clear the active selection so its popup doesn't linger
		const setAndClearSelection = (partial: Partial<MapDataState>) => {
			set({ clickedId: undefined, selectedId: undefined, ...partial });
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
				setScope: (scope, isScopeEnabled, scopeViewKey) => {
					set({ isScopeEnabled, scope, scopeViewKey });
				},
				setScopeEnabled: (isScopeEnabled) => {
					set({ isScopeEnabled });
				},
				setSelectedId: (selectedId) => {
					// A selection takes the filter panel's place; clearing one leaves the panel as it is
					set({
						selectedId,
						...(selectedId === undefined
							? { clickedId: undefined, isPopupVisible: true }
							: { isFilterOpen: false }),
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
