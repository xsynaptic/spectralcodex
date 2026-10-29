import type { PropsWithChildren } from 'react';

import { Component } from 'react';

import { MapCanvasFallback } from '#canvas/canvas-fallback.tsx';
import { getTrackedErrorMessage, trackMapErrorOnce } from '#track.ts';

interface MapErrorBoundaryState {
	hasError: boolean;
}

export class MapErrorBoundary extends Component<PropsWithChildren, MapErrorBoundaryState> {
	override state: MapErrorBoundaryState = { hasError: false };

	static getDerivedStateFromError(): MapErrorBoundaryState {
		return { hasError: true };
	}

	override componentDidCatch(error: unknown) {
		trackMapErrorOnce('render', () => ({ message: getTrackedErrorMessage(error) }));
	}

	override render() {
		if (this.state.hasError) return <MapCanvasFallback messageKey="errorMessage" />;

		return this.props.children;
	}
}
