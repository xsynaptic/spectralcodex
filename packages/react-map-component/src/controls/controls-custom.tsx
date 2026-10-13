import type { ReactElement } from 'react';
import type { ControlPosition, IControl } from 'react-map-gl/maplibre';

import { createPortal } from 'react-dom';
import { useControl } from 'react-map-gl/maplibre';

interface CustomControlConfig {
	className?: string | undefined;
	position: ControlPosition;
}

type CustomControlProps = Pick<CustomControlConfig, 'className' | 'position'> & {
	children: ReactElement;
};

class CustomControl implements IControl {
	#container = document.createElement('div');
	#position: ControlPosition = 'top-left';

	constructor({ className, position }: CustomControlConfig) {
		this.#container.className = className ?? 'maplibregl-ctrl maplibregl-ctrl-group';
		this.#position = position;
	}

	getDefaultPosition?() {
		return this.#position;
	}

	getElement() {
		return this.#container;
	}

	onAdd() {
		return this.#container;
	}

	onRemove() {
		this.#container.remove();
	}
}

export function CustomControlPortal({ children, className, position }: CustomControlProps) {
	const customControl = useControl<CustomControl>(() => new CustomControl({ className, position }));

	return createPortal(children, customControl.getElement());
}
