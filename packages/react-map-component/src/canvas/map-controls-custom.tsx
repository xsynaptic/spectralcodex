/* eslint-disable unicorn/no-null */
import { cloneElement, memo } from 'react';
import { createPortal } from 'react-dom';
import { useControl } from 'react-map-gl/maplibre';

import type { ReactElement } from 'react';
import type { ControlPosition, IControl, MapInstance } from 'react-map-gl/maplibre';

interface CustomControlConfig {
	map: MapInstance;
	position: ControlPosition;
	className?: string | undefined;
	redraw?: () => void; // Not entirely sure what this is for
}

type CustomControlProps = Pick<CustomControlConfig, 'position' | 'className'> & {
	children: ReactElement;
};

class CustomControl implements IControl {
	_map: MapInstance | null = null;
	_container: HTMLElement | null = null;
	_className = 'maplibregl-ctrl maplibregl-ctrl-group';
	_position: ControlPosition = 'top-left';
	_redraw?: () => void;

	constructor({ map, position, className, redraw }: CustomControlConfig) {
		this._map = map;
		this._position = position;
		if (className !== undefined) this._className = className;
		if (redraw !== undefined) this._redraw = redraw;
	}

	onAdd(map: MapInstance) {
		this._container = document.createElement('div');
		this._container.className = this._className;

		if (this._redraw !== undefined) {
			map.on('move', this._redraw);
			this._redraw();
		}
		return this._container;
	}

	onRemove() {
		if (this._map === null || this._container === null) return;
		this._container.remove();
		if (this._redraw !== undefined) this._map.off('move', this._redraw);
		this._map = null;
	}

	getDefaultPosition?() {
		return this._position;
	}

	getMap() {
		return this._map;
	}

	getElement() {
		return this._container;
	}
}

export const CustomControlPortal = memo(({ position, className, children }: CustomControlProps) => {
	const customControl = useControl<CustomControl>(
		({ map }) => new CustomControl({ map: map.getMap(), position, className }),
	);

	const map = customControl.getMap();
	const element = customControl.getElement();

	if (map === null || element === null) return;

	// Note: the original implementation passed `{ map }` as a prop in the second argument of `cloneElement`
	// But since we're not making use of it I have removed it, as it renders to the DOM
	return createPortal(cloneElement(children), element);
});
