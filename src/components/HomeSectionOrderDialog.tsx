import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  moveHomeSection,
  moveHomeSectionToIndex,
  type HomeSectionId,
  type HomeSectionOrder,
} from '../services/homeSectionOrder';

const SECTION_LABELS: Record<HomeSectionId, string> = {
  featured: '注目イベント',
  'limited-today': '今日の時間限定イベント',
  ongoing: '開催中のイベント',
  weekly: '週間イベント',
  raids: '現在のレイド',
  favorites: 'お気に入り情報',
};

const focusableSelector = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface HomeSectionOrderDialogProps {
  order: HomeSectionOrder;
  onCancel(): void;
  onSave(order: HomeSectionOrder): void;
}

export function HomeSectionOrderDialog({ order, onCancel, onSave }: HomeSectionOrderDialogProps) {
  const [draft, setDraft] = useState<HomeSectionOrder>(order);
  const [dragging, setDragging] = useState<HomeSectionId | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const draftRef = useRef<HomeSectionOrder>(order);
  const draggingRef = useRef<HomeSectionId | null>(null);
  const previousRowPositionsRef = useRef(new Map<HomeSectionId, DOMRect>());

  const captureRowPositions = () => {
    const positions = new Map<HomeSectionId, DOMRect>();
    listRef.current?.querySelectorAll<HTMLElement>('[data-home-section-id]').forEach((row) => {
      const id = row.dataset.homeSectionId as HomeSectionId | undefined;
      if (id) positions.set(id, row.getBoundingClientRect());
    });
    previousRowPositionsRef.current = positions;
  };

  const replaceDraft = (next: HomeSectionOrder) => {
    if (next.every((id, index) => id === draftRef.current[index])) return;
    captureRowPositions();
    draftRef.current = next;
    setDraft(next);
  };

  useLayoutEffect(() => {
    const previousPositions = previousRowPositionsRef.current;
    previousRowPositionsRef.current = new Map();
    if (
      previousPositions.size === 0 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;

    listRef.current?.querySelectorAll<HTMLElement>('[data-home-section-id]').forEach((row) => {
      const id = row.dataset.homeSectionId as HomeSectionId | undefined;
      const previous = id ? previousPositions.get(id) : undefined;
      const current = row.getBoundingClientRect();
      const offsetY = previous ? previous.top - current.top : 0;
      if (!offsetY || id === draggingRef.current) return;
      row.animate(
        [
          { transform: `translateY(${offsetY}px)` },
          { transform: 'translateY(0)' },
        ],
        { duration: 180, easing: 'ease-out' },
      );
    });
  }, [draft]);

  useEffect(() => {
    saveButtonRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
        const first = focusable.at(0);
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const move = (source: HomeSectionId, offset: -1 | 1) => {
    const current = draftRef.current;
    const sourceIndex = current.indexOf(source);
    const target = current[sourceIndex + offset];
    if (target) replaceDraft(moveHomeSection(current, source, target));
  };

  const destinationIndexAt = (source: HomeSectionId, clientY: number): number => {
    const rows = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[data-home-section-id]') ?? [],
    ).filter((row) => row.dataset.homeSectionId !== source);

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (row && clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2) {
        return index;
      }
    }
    return rows.length;
  };

  const finishDrag = () => {
    draggingRef.current = null;
    setDragging(null);
  };

  return createPortal(
    <div className="home-section-order-overlay" onPointerDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section ref={dialogRef} className="home-section-order-dialog" role="dialog" aria-modal="true" aria-labelledby="home-section-order-title">
        <h2 id="home-section-order-title">ホームの並び順を編集</h2>
        <p>右端のハンドルを押したまま、上下へ動かして並び替えます。</p>
        <ol ref={listRef} className="home-section-order-list">
          {draft.map((id, index) => (
            <li className={dragging === id ? 'is-dragging' : ''} data-home-section-id={id} key={id}>
              <span>{SECTION_LABELS[id]}</span>
              <div className="home-section-order-row__actions">
                <button type="button" className="home-section-order-move" aria-label={`${SECTION_LABELS[id]}を上へ`} disabled={index === 0} onClick={() => move(id, -1)}>↑</button>
                <button type="button" className="home-section-order-move" aria-label={`${SECTION_LABELS[id]}を下へ`} disabled={index === draft.length - 1} onClick={() => move(id, 1)}>↓</button>
                <button
                  type="button"
                  className="home-section-order-handle"
                  aria-label={`${SECTION_LABELS[id]}をドラッグして並び替え`}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    draggingRef.current = id;
                    setDragging(id);
                  }}
                  onPointerMove={(event) => {
                    if (draggingRef.current !== id) return;
                    const destinationIndex = destinationIndexAt(id, event.clientY);
                    replaceDraft(moveHomeSectionToIndex(draftRef.current, id, destinationIndex));
                  }}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h14" /></svg>
                </button>
              </div>
            </li>
          ))}
        </ol>
        <div className="home-section-order-dialog__actions">
          <button type="button" onClick={onCancel}>キャンセル</button>
          <button ref={saveButtonRef} type="button" className="home-section-order-save" onClick={() => onSave(draft)}>保存</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
