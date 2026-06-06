import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import { createMapStore } from './store-factory';

describe('createMapStore', () => {
	test('merges initial config over defaults', () => {
		const store = createMapStore({ showObjectiveFilter: true });

		expect(store.getState().showObjectiveFilter).toBe(true);
		expect(store.getState().statusFilter).toEqual([]);
	});

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
		expect(store.getState().statusFilter).toEqual(Object.values(LocationStatusEnum));

		store.getState().actions.showAllStatusFilter();
		expect(store.getState().statusFilter).toEqual([]);
	});

	test('filter changes clear the active selection', () => {
		const store = createMapStore();
		const { setSelectedId, toggleStatusFilter, setQualityFilter, setFilterOpen } =
			store.getState().actions;

		setSelectedId('location-1');
		toggleStatusFilter(LocationStatusEnum.Abandoned);
		expect(store.getState().selectedId).toBeUndefined();

		setSelectedId('location-2');
		setQualityFilter(3);
		expect(store.getState().selectedId).toBeUndefined();

		setSelectedId('location-3');
		setFilterOpen(true);
		expect(store.getState().selectedId).toBeUndefined();
	});

	test('clearing the selection restores popup visibility', () => {
		const store = createMapStore();
		const { setSelectedId, setPopupVisible } = store.getState().actions;

		setSelectedId('location-1');
		setPopupVisible(false);

		setSelectedId(undefined);
		expect(store.getState().popupVisible).toBe(true);
	});
});
