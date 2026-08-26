import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clearAppLocalStorage } from '../services/appStorage';
import { shareSiteHome } from '../services/siteShare';
import type { TabPosition } from '../services/tabPosition';
import type { Theme } from '../services/theme';
import '../styles/settings.css';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface SettingsPageProps {
  tabPosition: TabPosition;
  onTabPositionChange(position: TabPosition): void;
  theme: Theme;
  onThemeChange(theme: Theme): void;
}

export function SettingsPage({
  tabPosition,
  onTabPositionChange,
  theme,
  onThemeChange,
}: SettingsPageProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const deleteDialogRef = useRef<HTMLElement>(null);
  const deleteCancelButtonRef = useRef<HTMLButtonElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2000);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    window.requestAnimationFrame(() => {
      deleteButtonRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!deleteDialogOpen) return undefined;
    const focusTimer = window.setTimeout(() => {
      deleteCancelButtonRef.current?.focus({ preventScroll: true });
    }, 20);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDeleteDialog();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = deleteDialogRef.current
        ? Array.from(deleteDialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        : [];
      const firstItem = focusable.at(0);
      const lastItem = focusable.at(-1);
      if (!firstItem || !lastItem) return;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeDeleteDialog, deleteDialogOpen]);

  const handleShare = async () => {
    const result = await shareSiteHome(navigator, window.location.href);
    if (result === 'copied') {
      showToast('リンクをコピーしました');
    } else if (result === 'failed') {
      showToast('共有できませんでした');
    }
  };

  const handleDeleteStoredData = () => {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }

    const result = clearAppLocalStorage(storage);
    closeDeleteDialog();
    showToast(
      result.success
        ? '保存データを削除しました'
        : '一部の保存データを削除できませんでした',
    );
  };

  return (
    <div className="settings-page">
      <header className="page-heading settings-page__heading">
        <div><h1>設定</h1></div>
      </header>

      <div className="settings-list">
        <section className="settings-card" aria-labelledby="settings-tab-position-title">
          <div className="settings-card__copy">
            <h2 id="settings-tab-position-title">タブ位置</h2>
            <p>メインタブを画面の上部または下部へ配置します。</p>
          </div>
          <div
            className="settings-segmented-control"
            role="group"
            aria-labelledby="settings-tab-position-title"
          >
            {([
              ['top', '上部'],
              ['bottom', '下部'],
            ] as const).map(([position, label]) => (
              <button
                key={position}
                type="button"
                className={tabPosition === position ? 'is-selected' : ''}
                aria-pressed={tabPosition === position}
                onClick={() => onTabPositionChange(position)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-card settings-card--row" aria-labelledby="settings-theme-title">
          <div className="settings-card__copy">
            <h2 id="settings-theme-title">ダークモード</h2>
            <p>画面の配色を切り替えます。</p>
          </div>
          <button
            type="button"
            className="settings-switch"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="ダークモード"
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          >
            <span className="settings-switch__track" aria-hidden="true">
              <span className="settings-switch__thumb" />
            </span>
            <span>{theme === 'dark' ? 'ON' : 'OFF'}</span>
          </button>
        </section>

        <section className="settings-card settings-card--row" aria-labelledby="settings-share-title">
          <div className="settings-card__copy">
            <h2 id="settings-share-title">サイトの共有</h2>
            <p>GO Scopeホームのリンクを共有します。</p>
          </div>
          <button
            type="button"
            className="settings-action-button"
            onClick={() => void handleShare()}
          >
            サイトを共有
          </button>
        </section>

        <section className="settings-card settings-card--danger" aria-labelledby="settings-delete-title">
          <div className="settings-card__copy">
            <h2 id="settings-delete-title">保存データの削除</h2>
            <p>このサイトが保存した設定・お気に入り・入力内容などを削除します。</p>
          </div>
          <button
            ref={deleteButtonRef}
            type="button"
            className="settings-danger-button"
            aria-haspopup="dialog"
            aria-expanded={deleteDialogOpen}
            onClick={() => setDeleteDialogOpen(true)}
          >
            保存データを削除
          </button>
        </section>
      </div>

      {typeof document !== 'undefined' ? createPortal(
        <>
          {deleteDialogOpen ? (
            <div className="storage-dialog-layer" onClick={closeDeleteDialog}>
              <section
                ref={deleteDialogRef}
                className="storage-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="storage-dialog-title"
                aria-describedby="storage-dialog-description"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id="storage-dialog-title">保存データを削除しますか？</h2>
                <p id="storage-dialog-description">
                  GO Scopeに保存されている設定・お気に入り・入力内容などを削除します。この操作は元に戻せません。
                </p>
                <div className="storage-dialog__actions">
                  <button
                    ref={deleteCancelButtonRef}
                    type="button"
                    onClick={closeDeleteDialog}
                  >
                    キャンセル
                  </button>
                  <button
                    className="storage-dialog__delete"
                    type="button"
                    onClick={handleDeleteStoredData}
                  >
                    削除する
                  </button>
                </div>
              </section>
            </div>
          ) : null}
          {toastMessage ? (
            <div className="site-action-toast" role="status" aria-live="polite">
              {toastMessage}
            </div>
          ) : null}
        </>,
        document.body,
      ) : null}
    </div>
  );
}

export default SettingsPage;
