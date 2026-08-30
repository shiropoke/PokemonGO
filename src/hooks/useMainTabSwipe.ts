import { useCallback, useRef } from 'react';
import type { PointerEventHandler, RefObject } from 'react';
import type { Page } from '../types/navigation';
import {
  getMainTabSwipeTarget,
  isInsideScrollableHorizontalRegion,
  isMultiTouchSwipeBlocked,
  isSwipeStartTargetExcluded,
  isWithinSwipeEdgeExclusion,
  resolveSwipeDirectionLock,
  type SwipeDirectionLock,
} from '../utils/swipeNavigation';

interface MainTabSwipeGesture {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  directionLock: SwipeDirectionLock;
}

interface UseMainTabSwipeOptions {
  currentPage: Page;
  mainTabs: readonly Page[];
  disabled: boolean;
  surfaceRef: RefObject<HTMLElement | null>;
  onNavigate(page: Page): void;
}

export function useMainTabSwipe({
  currentPage,
  mainTabs,
  disabled,
  surfaceRef,
  onNavigate,
}: UseMainTabSwipeOptions) {
  const gestureRef = useRef<MainTabSwipeGesture | null>(null);
  const activeTouchPointersRef = useRef(new Set<number>());
  const multiTouchBlockedRef = useRef(false);

  const resetPointer = useCallback((pointerId: number) => {
    activeTouchPointersRef.current.delete(pointerId);
    if (gestureRef.current?.pointerId === pointerId) gestureRef.current = null;
    if (activeTouchPointersRef.current.size === 0) multiTouchBlockedRef.current = false;
  }, []);

  const onPointerDown = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    if (event.pointerType !== 'touch') return;

    activeTouchPointersRef.current.add(event.pointerId);
    if (isMultiTouchSwipeBlocked(event.isPrimary, activeTouchPointersRef.current.size)) {
      multiTouchBlockedRef.current = true;
      gestureRef.current = null;
      return;
    }

    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    if (
      disabled
      || multiTouchBlockedRef.current
      || isWithinSwipeEdgeExclusion(event.clientX, viewportWidth)
      || isSwipeStartTargetExcluded(event.target)
      || isInsideScrollableHorizontalRegion(event.target, surfaceRef.current)
      || document.querySelector('[role="dialog"][aria-modal="true"]')
    ) {
      return;
    }

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      directionLock: 'pending',
    };
  }, [disabled, surfaceRef]);

  const onPointerMove = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || multiTouchBlockedRef.current) return;

    gesture.currentX = event.clientX;
    gesture.currentY = event.clientY;
    gesture.directionLock = resolveSwipeDirectionLock(
      gesture.directionLock,
      gesture.currentX - gesture.startX,
      gesture.currentY - gesture.startY,
    );
  }, []);

  const onPointerUp = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    const gesture = gestureRef.current;
    if (
      !disabled
      && !multiTouchBlockedRef.current
      && gesture
      && gesture.pointerId === event.pointerId
    ) {
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      const directionLock = resolveSwipeDirectionLock(gesture.directionLock, dx, dy);
      const targetPage = getMainTabSwipeTarget({
        currentPage,
        mainTabs,
        directionLock,
        dx,
        dy,
        viewportWidth: window.visualViewport?.width ?? window.innerWidth,
      });
      if (targetPage) onNavigate(targetPage);
    }
    resetPointer(event.pointerId);
  }, [currentPage, disabled, mainTabs, onNavigate, resetPointer]);

  const onPointerCancel = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    resetPointer(event.pointerId);
  }, [resetPointer]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
