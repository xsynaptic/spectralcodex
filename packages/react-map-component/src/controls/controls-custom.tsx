import type { ReactElement } from 'react';
import type { ControlPosition, IControl, MapInstance } from 'react-map-gl/maplibre';

import { createPortal } from 'react-dom';
import { useControl } from 'react-map-gl/maplibre';

interface CustomControlConfig {
	className?: string | undefined;
	position: ControlPosition;
	redraw?: () => void; // Optional; use this if the control needs to be redrawn when the map is moved
}

type CustomControlProps = Pick<CustomControlConfig, 'className' | 'position'> & {
	children: ReactElement;
};

class CustomControl implements IControl {
	#container = document.createElement('div');
	#map: MapInstance | undefined;
	#position: ControlPosition = 'top-left';
	#redraw?: () => void;

	constructor({ className, position, redraw }: CustomControlConfig) {
		this.#container.className = className ?? 'maplibregl-ctrl maplibregl-ctrl-group';
		this.#position = position;
		if (redraw !== undefined) this.#redraw = redraw;
	}

	getDefaultPosition?() {
		return this.#position;
	}

	getElement() {
		return this.#container;
	}

	onAdd(map: MapInstance) {
		this.#map = map;

		if (this.#redraw !== undefined) {
			map.on('move', this.#redraw);
			this.#redraw();
		}
		return this.#container;
	}

	onRemove() {
		this.#container.remove();
		if (this.#redraw !== undefined) this.#map?.off('move', this.#redraw);
		this.#map = undefined;
	}
}

export function CustomControlPortal({ children, className, position }: CustomControlProps) {
	const customControl = useControl<CustomControl>(() => new CustomControl({ className, position }));

	return createPortal(children, customControl.getElement());
}
