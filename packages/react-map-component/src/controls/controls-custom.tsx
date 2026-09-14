/* eslint-disable unicorn/no-null -- react and react-map-gl APIs use null throughout this control wrapper */
import type { ReactElement } from 'react';
import type { ControlPosition, IControl, MapInstance } from 'react-map-gl/maplibre';

import { cloneElement, memo } from 'react';
import { createPortal } from 'react-dom';
import { useControl } from 'react-map-gl/maplibre';

interface CustomControlConfig {
	className?: string | undefined;
	map: MapInstance;
	position: ControlPosition;
	redraw?: () => void; // Optional; use this if the control needs to be redrawn when the map is moved
}

type CustomControlProps = Pick<CustomControlConfig, 'className' | 'position'> & {
	children: ReactElement;
};

class CustomControl implements IControl {
	#className = 'maplibregl-ctrl maplibregl-ctrl-group';
	#container: HTMLElement | null = null;
	#map: MapInstance | null = null;
	#position: ControlPosition = 'top-left';
	#redraw?: () => void;

	constructor({ className, map, position, redraw }: CustomControlConfig) {
		this.#map = map;
		this.#position = position;
		if (className !== undefined) this.#className = className;
		if (redraw !== undefined) this.#redraw = redraw;
	}

	getDefaultPosition?() {
		return this.#position;
	}

	getElement() {
		return this.#container;
	}

	getMap() {
		return this.#map;
	}

	onAdd(map: MapInstance) {
		this.#container = document.createElement('div');
		this.#container.className = this.#className;

		if (this.#redraw !== undefined) {
			map.on('move', this.#redraw);
			this.#redraw();
		}
		return this.#container;
	}

	onRemove() {
		if (this.#map === null || this.#container === null) return;
		this.#container.remove();
		if (this.#redraw !== undefined) this.#map.off('move', this.#redraw);
		this.#map = null;
	}
}

export const CustomControlPortal = memo(function CustomControlPortal({
	children,
	className,
	position,
}: CustomControlProps) {
	const customControl = useControl<CustomControl>(
		({ map }) => new CustomControl({ className, map: map.getMap(), position }),
	);

	const map = customControl.getMap();
	const element = customControl.getElement();

	if (map === null || element === null) return;

	// Note: the original implementation passed `{ map }` as a prop in the second argument of `cloneElement`
	// But since we're not making use of it I have removed it, as it renders to the DOM
	return createPortal(cloneElement(children), element);
});
