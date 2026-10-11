import type { ReactElement } from 'react';
import type { ControlPosition, IControl, MapInstance } from 'react-map-gl/maplibre';

import { cloneElement, memo, useEffect, useState } from 'react';
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
	#container: HTMLElement | undefined;
	#map: MapInstance | undefined;
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
		if (this.#map === undefined || this.#container === undefined) return;
		this.#container.remove();
		if (this.#redraw !== undefined) this.#map.off('move', this.#redraw);
		this.#map = undefined;
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

	const [, setIsAdded] = useState(false);

	// `useControl` adds the control in an effect, so its element exists only after the first render
	useEffect(() => {
		setIsAdded(true);
	}, []);

	const map = customControl.getMap();
	const element = customControl.getElement();

	if (map === undefined || element === undefined) return;

	// Note: the original implementation passed `{ map }` as a prop in the second argument of `cloneElement`
	// But since we're not making use of it I have removed it, as it renders to the DOM
	return createPortal(cloneElement(children), element);
});
