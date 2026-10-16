import { useCallback, useEffect, useRef } from 'react';

import type { MapOverlay } from '#store/store-factory.ts';
import type { MapOverlayClose } from '#types.ts';

import { useMapStore } from '#store/store.tsx';

export function useOverlay(overlay: MapOverlay) {
	const isOpen = useMapStore((state) => state.overlay === overlay);
	const { setOverlay } = useMapStore((state) => state.actions);

	const openerRef = useRef<HTMLButtonElement>(null);
	const overlayRef = useRef<HTMLDivElement>(null);
	const closeRef = useRef<MapOverlayClose>('dismiss');

	const open = useCallback(() => {
		setOverlay(overlay, true);
	}, [overlay, setOverlay]);

	const close = useCallback(
		(how: MapOverlayClose) => {
			closeRef.current = how;
			setOverlay(overlay, false);
		},
		[overlay, setOverlay],
	);

	useEffect(() => {
		if (isOpen || closeRef.current === 'dismiss') return;

		openerRef.current?.focus({ focusVisible: closeRef.current === 'keyboard' });
		closeRef.current = 'dismiss';
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;

		function isInside(target: EventTarget | null) {
			return (
				target instanceof Node &&
				((overlayRef.current?.contains(target) ?? false) ||
					(openerRef.current?.contains(target) ?? false))
			);
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Escape' || event.isComposing) return;

			close(isInside(document.activeElement) ? 'keyboard' : 'dismiss');
		}

		// Captured so that pressing an element that can't take focus still closes the overlay
		function handlePointerDown(event: PointerEvent) {
			if (!isInside(event.target)) close('dismiss');
		}

		function handleFocusOut(event: FocusEvent) {
			if (!document.hasFocus() || !isInside(event.target) || isInside(event.relatedTarget)) return;

			close('dismiss');
		}

		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('pointerdown', handlePointerDown, { capture: true });
		document.addEventListener('focusout', handleFocusOut);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
			document.removeEventListener('focusout', handleFocusOut);
		};
	}, [close, isOpen]);

	return { close, isOpen, open, openerRef, overlayRef };
}
