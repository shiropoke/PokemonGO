import { useMemo, useState } from 'react';
import type { Pokefuta } from '../types/pokefuta';
import {
  createPokefutaCsv,
  createPokefutaKml,
  downloadTextFile,
  getPokefutaExportFilename,
  getPokefutaExportLids,
} from '../utils/pokefutaExport';

const GOOGLE_MY_MAPS_URL = 'https://mymaps.google.com/';

interface PokefutaExportMenuProps {
  lids: readonly Pokefuta[];
  prefectureName: string;
  prefectureSlug: string;
}

export function PokefutaExportMenu({
  lids,
  prefectureName,
  prefectureSlug,
}: PokefutaExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const exportableLids = useMemo(() => getPokefutaExportLids(lids), [lids]);
  const missingCount = lids.length - exportableLids.length;

  const saveCsv = () => {
    downloadTextFile(
      createPokefutaCsv(lids),
      getPokefutaExportFilename(prefectureSlug, 'csv'),
      'text/csv',
    );
    setStatus('CSVを保存しました');
  };

  const saveKml = () => {
    downloadTextFile(
      createPokefutaKml(lids),
      getPokefutaExportFilename(prefectureSlug, 'kml'),
      'application/vnd.google-earth.kml+xml',
    );
    setStatus('KMLを保存しました');
  };

  return (
    <div className="pokefuta-export">
      <button
        type="button"
        className="pokefuta-export__toggle"
        aria-expanded={open}
        aria-controls="pokefuta-export-menu"
        onClick={() => {
          setOpen((value) => !value);
          setStatus('');
        }}
      >
        Google マイマップ用に保存
      </button>
      {open ? (
        <div
          id="pokefuta-export-menu"
          className="pokefuta-export__menu"
          role="dialog"
          aria-label={`${prefectureName}のポケふたをGoogle マイマップ用に保存`}
        >
          <div className="pokefuta-export__heading">
            <strong>{prefectureName}のポケふた {exportableLids.length}件</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="保存メニューを閉じる">×</button>
          </div>
          <p>
            Google Mapsの保存済みリストへ直接追加する機能ではありません。
            保存したファイルをGoogle マイマップへインポートできます。
          </p>
          {missingCount > 0 ? (
            <p className="pokefuta-export__missing">
              {missingCount}件は座標情報がないため出力されません。
            </p>
          ) : null}
          <div className="pokefuta-export__actions">
            <button type="button" onClick={saveCsv} disabled={exportableLids.length === 0}>CSVを保存</button>
            <button type="button" onClick={saveKml} disabled={exportableLids.length === 0}>KMLを保存</button>
            <a href={GOOGLE_MY_MAPS_URL} target="_blank" rel="noopener noreferrer">
              Google マイマップを開く
            </a>
          </div>
          <ol>
            <li>CSVまたはKMLを保存</li>
            <li>Google マイマップで新しい地図を作成</li>
            <li>「インポート」から保存したファイルを選択</li>
          </ol>
          <p className="pokefuta-export__status" aria-live="polite">{status}</p>
        </div>
      ) : null}
    </div>
  );
}

