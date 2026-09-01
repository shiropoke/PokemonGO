import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import {
  moveHomeSection,
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
  const saveButtonRef = useRef<HTMLButtonElement>(null);

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
    const sourceIndex = draft.indexOf(source);
    const target = draft[sourceIndex + offset];
    if (target) setDraft((current) => moveHomeSection(current, source, target));
  };

  return createPortal(
    <div className="home-section-order-overlay" onPointerDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section ref={dialogRef} className="home-section-order-dialog" role="dialog" aria-modal="true" aria-labelledby="home-section-order-title">
        <h2 id="home-section-order-title">ホームの並び順を編集</h2>
        <p>右端のハンドルを押したまま、上下へ動かして並び替えます。</p>
        <ol className="home-section-order-list">
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
                    setDragging(id);
                  }}
                  onPointerMove={(event) => {
                    if (dragging !== id) return;
                    const target = document.elementFromPoint(event.clientX, event.clientY)
                      ?.closest<HTMLElement>('[data-home-section-id]')
                      ?.dataset.homeSectionId as HomeSectionId | undefined;
                    if (target && target !== id) setDraft((current) => moveHomeSection(current, id, target));
                  }}
                  onPointerUp={() => setDragging(null)}
                  onPointerCancel={() => setDragging(null)}
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
