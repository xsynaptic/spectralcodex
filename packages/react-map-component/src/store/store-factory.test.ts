import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import { createMapStore, hasActiveFilter } from '#store/store-factory.ts';

describe('createMapStore', () => {
	test('toggleStatusFilter adds an absent status and removes a present one', () => {
		const store = createMapStore();
		const { toggleStatusFilter } = store.getState().actions;

		toggleStatusFilter(LocationStatusEnum.Abandoned);
		expect(store.getState().statusFilter).toEqual([LocationStatusEnum.Abandoned]);

		toggleStatusFilter(LocationStatusEnum.Abandoned);
		expect(store.getState().statusFilter).toEqual([]);
	});

	test('show/hide all set the exclude-list to empty / every status', () => {
		const store = createMapStore();

		store.getState().actions.hideAllStatusFilter();
		expect(new Set(store.getState().statusFilter)).toEqual(
			new Set(Object.values(LocationStatusEnum)),
		);

		store.getState().actions.showAllStatusFilter();
		expect(store.getState().statusFilter).toEqual([]);
	});

	test('filter changes clear the active selection', () => {
		const store = createMapStore();
		const { setEntryQualityFilter, setFilterOpen, setSelectedId, toggleStatusFilter } =
			store.getState().actions;

		setSelectedId('location-1');
		toggleStatusFilter(LocationStatusEnum.Abandoned);
		expect(store.getState().selectedId).toBeUndefined();

		setSelectedId('location-2');
		setEntryQualityFilter(3);
		expect(store.getState().selectedId).toBeUndefined();

		setSelectedId('location-3');
		setFilterOpen(true);
		expect(store.getState().selectedId).toBeUndefined();
	});

	test('toggling one status leaves the others in the exclude-list', () => {
		const store = createMapStore();
		const { toggleStatusFilter } = store.getState().actions;

		toggleStatusFilter(LocationStatusEnum.Abandoned);
		toggleStatusFilter(LocationStatusEnum.Vanished);
		toggleStatusFilter(LocationStatusEnum.Abandoned);

		expect(store.getState().statusFilter).toEqual([LocationStatusEnum.Vanished]);
	});

	test('a filter setter stores its value, not only the cleared selection', () => {
		const store = createMapStore();
		const { setEntryQualityFilter, setFilterOpen, setObjectiveFilter, setRatingFilter } =
			store.getState().actions;

		setEntryQualityFilter(3);
		setObjectiveFilter(4);
		setRatingFilter(5);
		setFilterOpen(true);

		expect(store.getState()).toMatchObject({
			entryQualityFilter: 3,
			isFilterOpen: true,
			objectiveFilter: 4,
			ratingFilter: 5,
		});
	});

	test('selecting closes the filter panel and leaves popup visibility alone', () => {
		const store = createMapStore();
		const { setFilterOpen, setPopupVisible, setSelectedId } = store.getState().actions;

		setFilterOpen(true);
		setPopupVisible(false);
		expect(store.getState().isPopupVisible).toBe(false);

		setSelectedId('location-1');

		expect(store.getState()).toMatchObject({
			isFilterOpen: false,
			isPopupVisible: false,
			selectedId: 'location-1',
		});
	});

	test('clearing the selection leaves the filter panel open', () => {
		const store = createMapStore();
		const { setFilterOpen, setSelectedId } = store.getState().actions;

		setFilterOpen(true);
		setSelectedId(undefined);

		expect(store.getState().isFilterOpen).toBe(true);
	});

	test('clearing the selection restores popup visibility', () => {
		const store = createMapStore();
		const { setPopupVisible, setSelectedId } = store.getState().actions;

		setSelectedId('location-1');
		setPopupVisible(false);

		setSelectedId(undefined);
		expect(store.getState().isPopupVisible).toBe(true);
	});
});

describe('hasActiveFilter', () => {
	test('a new store has no active filter', () => {
		expect(hasActiveFilter(createMapStore().getState())).toBe(false);
	});

	test('one hidden status is an active filter, and showing all clears it', () => {
		const store = createMapStore();
		const { showAllStatusFilter, toggleStatusFilter } = store.getState().actions;

		toggleStatusFilter(LocationStatusEnum.Abandoned);
		expect(hasActiveFilter(store.getState())).toBe(true);

		showAllStatusFilter();
		expect(hasActiveFilter(store.getState())).toBe(false);
	});

	test('a minimum rating above 1 is an active filter that showing all leaves in place', () => {
		const store = createMapStore();
		const { setRatingFilter, showAllStatusFilter } = store.getState().actions;

		setRatingFilter(2);
		showAllStatusFilter();

		expect(hasActiveFilter(store.getState())).toBe(true);
	});

	test('an objective above 1 counts only where the objective filter is enabled', () => {
		const disabledStore = createMapStore();
		const enabledStore = createMapStore({ isObjectiveFilterEnabled: true });

		disabledStore.getState().actions.setObjectiveFilter(3);
		enabledStore.getState().actions.setObjectiveFilter(3);

		expect(hasActiveFilter(disabledStore.getState())).toBe(false);
		expect(hasActiveFilter(enabledStore.getState())).toBe(true);
	});

	test('the entry quality filter is not counted', () => {
		const store = createMapStore();

		store.getState().actions.setEntryQualityFilter(3);

		expect(hasActiveFilter(store.getState())).toBe(false);
	});
});
