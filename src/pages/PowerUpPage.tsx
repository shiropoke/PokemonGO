import { useMemo, useState } from 'react';
import { PokemonSelector } from '../components/PokemonSelector';
import { ToolDataStatus } from '../components/ToolDataStatus';
import { useToolData } from '../hooks/useToolData';
import type { Pokemon } from '../types/pokemon';
import { getLevels } from '../utils/cp';
import {
  calculatePowerUpCost,
  resolvePowerUpCostData,
} from '../utils/powerUp';
import '../styles/tools.css';

function initialSpeciesId(): string | null {
  const query = window.location.hash.split('?')[1];
  return new URLSearchParams(query ?? '').get('species');
}

function initialLevel(name: string, fallback: number): number {
  const query = window.location.hash.split('?')[1];
  const value = Number(new URLSearchParams(query ?? '').get(name));
  return Number.isInteger(value * 2) && value >= 1 && value <= 50
    ? value
    : fallback;
}

export function PowerUpPage() {
  const toolData = useToolData();
  const [speciesId, setSpeciesId] = useState<string | null>(initialSpeciesId);
  const [currentLevel, setCurrentLevel] = useState(() => initialLevel('level', 20));
  const [targetLevel, setTargetLevel] = useState(() => initialLevel('target', 40));
  const [lucky, setLucky] = useState(false);
  const [shadow, setShadow] = useState(false);
  const [purified, setPurified] = useState(false);

  const selectedPokemon = useMemo(
    () => toolData.pokemon.find((entry) => entry.speciesId === speciesId) ?? null,
    [speciesId, toolData.pokemon],
  );
  const resolvedCostData = toolData.gameData
    ? resolvePowerUpCostData(toolData.gameData.powerUp, speciesId)
    : null;
  const result = useMemo(() => {
    if (!resolvedCostData) return { result: null, error: null };
    try {
      return {
        result: calculatePowerUpCost(resolvedCostData, currentLevel, targetLevel, {
          lucky,
          shadow,
          purified,
        }),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : '強化コストを計算できませんでした。',
      };
    }
  }, [currentLevel, lucky, purified, resolvedCostData, shadow, targetLevel]);
  const usesSpeciesOverride = Boolean(
    speciesId && toolData.gameData?.powerUp.overrides[speciesId],
  );

  return (
    <div className="tool-page power-up-page">
      <header className="page-heading">
        <div>
          <span className="page-kicker">育成計画</span>
          <h1>強化コスト</h1>
          <p>現在PLから目標PLまでの、ほしのすなとアメを積算します。</p>
        </div>
      </header>

      <ToolDataStatus loading={toolData.loading} error={toolData.error} onRetry={toolData.retry} />
      <div className="tool-layout">
        <section className="tool-card tool-controls" aria-label="強化条件">
          <PokemonSelector
            pokemon={toolData.pokemon}
            selectedPokemon={selectedPokemon}
            loading={toolData.loading}
            error={toolData.error}
            onSelect={(pokemon: Pokemon) => setSpeciesId(pokemon.speciesId)}
            onRetry={toolData.retry}
          />
          <p className="tool-help">
            種族別コストがGame Masterにある場合に正しいテーブルへ切り替えるため、ポケモンを選択してください。
          </p>

          <div className="tool-field-grid">
            <label className="tool-field">
              <span>現在PL</span>
              <select value={currentLevel} onChange={(event) => setCurrentLevel(Number(event.target.value))}>
                {getLevels(50).map((level) => <option value={level} key={level}>PL{level}</option>)}
              </select>
            </label>
            <label className="tool-field">
              <span>目標PL</span>
              <select value={targetLevel} onChange={(event) => setTargetLevel(Number(event.target.value))}>
                {getLevels(50).map((level) => <option value={level} key={level}>PL{level}</option>)}
              </select>
            </label>
          </div>

          <fieldset className="tool-checks">
            <legend>コスト補正</legend>
            <label>
              <input type="checkbox" checked={lucky} onChange={(event) => setLucky(event.target.checked)} />
              <span>キラPokémon</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={shadow}
                onChange={(event) => {
                  setShadow(event.target.checked);
                  if (event.target.checked) setPurified(false);
                }}
              />
              <span>シャドウPokémon</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={purified}
                onChange={(event) => {
                  setPurified(event.target.checked);
                  if (event.target.checked) setShadow(false);
                }}
              />
              <span>ライトPokémon</span>
            </label>
          </fieldset>
        </section>

        <section className="tool-card tool-results" aria-live="polite">
          <div className="tool-section-heading">
            <div>
              <span className="page-kicker">計算結果</span>
              <h2>PL{currentLevel} → PL{targetLevel}</h2>
            </div>
            {usesSpeciesOverride ? <span className="tool-badge">種族別コスト</span> : null}
          </div>
          {result.error ? <p className="tool-notice tool-notice--error">{result.error}</p> : null}
          {result.result ? (
            <div className="power-cost-results">
              <div>
                <span>ほしのすな</span>
                <strong>{result.result.stardust.toLocaleString('ja-JP')}</strong>
              </div>
              <div>
                <span>アメ</span>
                <strong>{result.result.candy.toLocaleString('ja-JP')}</strong>
              </div>
              <div>
                <span>アメXL</span>
                <strong>{result.result.candyXl.toLocaleString('ja-JP')}</strong>
              </div>
              <p>強化 {result.result.powerUps}回（1回につきPL0.5）</p>
            </div>
          ) : null}
          {!speciesId ? (
            <p className="tool-notice">ポケモン未選択時は通常の強化コストを表示しています。</p>
          ) : null}
        </section>
      </div>

      <p className="data-credit tool-credit">
        コストテーブル：<a href="https://github.com/PokeMiners/game_masters" target="_blank" rel="noreferrer">PokeMiners Game Master</a>
      </p>
    </div>
  );
}
