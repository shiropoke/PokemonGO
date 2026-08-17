import { useEffect, useMemo, useState } from 'react';
import { IvSelector } from '../components/IvSelector';
import { PokemonSelector } from '../components/PokemonSelector';
import { ToolDataStatus } from '../components/ToolDataStatus';
import { useToolData } from '../hooks/useToolData';
import type { IndividualValues } from '../types/calculations';
import type { Pokemon } from '../types/pokemon';
import { getLevels } from '../utils/cp';
import { calculateEvolutionCp } from '../utils/evolutionCp';
import '../styles/tools.css';

const SIMULATION_LEVELS = [40, 50, 51] as const;

function getInitialSpeciesId(): string | null {
  const query = window.location.hash.split('?')[1];
  if (!query) return null;
  return new URLSearchParams(query).get('species');
}

function getInitialLevel(): number {
  const query = window.location.hash.split('?')[1];
  const level = Number(new URLSearchParams(query ?? '').get('level'));
  return Number.isInteger(level * 2) && level >= 1 && level <= 51 ? level : 25;
}

function getInitialIv(name: 'attack' | 'defense' | 'hp'): number {
  const query = window.location.hash.split('?')[1];
  const rawValue = new URLSearchParams(query ?? '').get(name);
  if (rawValue === null) return 15;
  const value = Number(rawValue);
  return Number.isInteger(value) && value >= 0 && value <= 15 ? value : 15;
}

function getInitialCp(): string {
  const query = window.location.hash.split('?')[1];
  const rawValue = new URLSearchParams(query ?? '').get('cp');
  if (rawValue === null) return '';
  const value = Number(rawValue);
  return Number.isInteger(value) && value >= 10 ? String(value) : '';
}

export function EvolutionCpPage() {
  const toolData = useToolData();
  const [speciesId, setSpeciesId] = useState<string | null>(getInitialSpeciesId);
  const [targetSpeciesId, setTargetSpeciesId] = useState<string | null>(null);
  const [currentCp, setCurrentCp] = useState(getInitialCp);
  const [level, setLevel] = useState(getInitialLevel);
  const [ivs, setIvs] = useState<IndividualValues>(() => ({
    attack: getInitialIv('attack'),
    defense: getInitialIv('defense'),
    hp: getInitialIv('hp'),
  }));

  const pokemonById = useMemo(
    () => new Map(toolData.pokemon.map((entry) => [entry.speciesId, entry])),
    [toolData.pokemon],
  );
  const selectedPokemon = speciesId ? pokemonById.get(speciesId) ?? null : null;
  const evolutionTargets = useMemo(() => {
    if (!speciesId || !toolData.gameData) return [];
    return (toolData.gameData.pokemon[speciesId]?.evolutions ?? []).flatMap((target) => {
      const pokemon = pokemonById.get(target.speciesId);
      return pokemon ? [{ ...target, pokemon }] : [];
    });
  }, [pokemonById, speciesId, toolData.gameData]);

  useEffect(() => {
    if (evolutionTargets.length === 0) {
      setTargetSpeciesId(null);
      return;
    }
    if (!evolutionTargets.some((target) => target.speciesId === targetSpeciesId)) {
      setTargetSpeciesId(evolutionTargets[0]?.speciesId ?? null);
    }
  }, [evolutionTargets, targetSpeciesId]);

  const targetPokemon = targetSpeciesId
    ? pokemonById.get(targetSpeciesId) ?? null
    : null;
  const result = useMemo(() => {
    if (!selectedPokemon || !targetPokemon) return null;
    try {
      return calculateEvolutionCp(
        selectedPokemon.baseStats,
        targetPokemon.baseStats,
        ivs,
        level,
      );
    } catch {
      return null;
    }
  }, [ivs, level, selectedPokemon, targetPokemon]);

  const comparison = useMemo(() => {
    if (!selectedPokemon || !targetPokemon) return [];
    return [...new Set([level, ...SIMULATION_LEVELS])].map((targetLevel) => ({
      targetLevel,
      ...calculateEvolutionCp(
        selectedPokemon.baseStats,
        targetPokemon.baseStats,
        ivs,
        targetLevel,
      ),
    }));
  }, [ivs, level, selectedPokemon, targetPokemon]);

  const enteredCp = currentCp === '' ? null : Number(currentCp);
  const cpMismatch =
    enteredCp !== null &&
    Number.isInteger(enteredCp) &&
    result !== null &&
    enteredCp !== result.sourceCp;

  return (
    <div className="tool-page evolution-tool-page">
      <header className="page-heading">
        <div>
          <span className="page-kicker">CPシミュレーション</span>
          <h1>進化後CP</h1>
          <p>進化前と同じPL・個体値を使い、進化後のCPを計算します。</p>
        </div>
      </header>

      <ToolDataStatus loading={toolData.loading} error={toolData.error} onRetry={toolData.retry} />
      <div className="tool-layout">
        <section className="tool-card tool-controls" aria-label="進化条件">
          <PokemonSelector
            pokemon={toolData.pokemon}
            selectedPokemon={selectedPokemon}
            loading={toolData.loading}
            error={toolData.error}
            onSelect={(pokemon: Pokemon) => {
              setSpeciesId(pokemon.speciesId);
              setTargetSpeciesId(null);
            }}
            onRetry={toolData.retry}
          />

          <div className="tool-field-grid">
            <label className="tool-field">
              <span>現在CP（確認用）</span>
              <input
                inputMode="numeric"
                type="number"
                min="10"
                value={currentCp}
                onChange={(event) => setCurrentCp(event.target.value)}
                placeholder="任意"
              />
            </label>
            <label className="tool-field">
              <span>現在PL</span>
              <select value={level} onChange={(event) => setLevel(Number(event.target.value))}>
                {getLevels(51).map((entry) => (
                  <option key={entry} value={entry}>PL{entry}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="tool-iv-stack">
            <IvSelector label="攻撃" value={ivs.attack} onChange={(attack) => setIvs((current) => ({ ...current, attack }))} />
            <IvSelector label="防御" value={ivs.defense} onChange={(defense) => setIvs((current) => ({ ...current, defense }))} />
            <IvSelector label="HP" value={ivs.hp} onChange={(hp) => setIvs((current) => ({ ...current, hp }))} />
          </div>
        </section>

        <section className="tool-card tool-results" aria-live="polite">
          <h2>進化先</h2>
          {!selectedPokemon ? <p className="tool-empty">ポケモンを選択してください。</p> : null}
          {selectedPokemon && evolutionTargets.length === 0 ? (
            <p className="tool-empty">現在のGame Masterで利用できる進化先がありません。</p>
          ) : null}
          {evolutionTargets.length > 0 ? (
            <div className="evolution-targets" role="group" aria-label="進化先を選択">
              {evolutionTargets.map((target) => (
                <button
                  type="button"
                  key={target.speciesId}
                  className={target.speciesId === targetSpeciesId ? 'is-selected' : ''}
                  aria-pressed={target.speciesId === targetSpeciesId}
                  onClick={() => setTargetSpeciesId(target.speciesId)}
                >
                  <strong>{target.pokemon.displayName}</strong>
                  {target.candyCost ? <small>アメ {target.candyCost}</small> : null}
                </button>
              ))}
            </div>
          ) : null}

          {result && selectedPokemon && targetPokemon ? (
            <>
              <div className="evolution-primary-result">
                <div>
                  <small>現在</small>
                  <strong>{selectedPokemon.displayName}</strong>
                  <span>CP {result.sourceCp.toLocaleString('ja-JP')} / PL {level}</span>
                </div>
                <span className="evolution-arrow" aria-hidden="true">→</span>
                <div>
                  <small>進化後予想</small>
                  <strong>{targetPokemon.displayName}</strong>
                  <span>CP {result.evolvedCp.toLocaleString('ja-JP')} / PL {level}</span>
                </div>
              </div>
              {cpMismatch ? (
                <p className="tool-notice">
                  入力CPと、選択したPL・個体値から計算した現在CPが一致しません。
                </p>
              ) : null}
              <div className="tool-metric-grid">
                {comparison.map((entry) => (
                  <div key={entry.targetLevel}>
                    <span>PL {entry.targetLevel}{entry.targetLevel === 51 ? '（相棒）' : ''}</span>
                    <strong>CP {entry.evolvedCp.toLocaleString('ja-JP')}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>

      <p className="data-credit tool-credit">
        計算データ：<a href="https://github.com/PokeMiners/game_masters" target="_blank" rel="noreferrer">PokeMiners Game Master</a>
      </p>
    </div>
  );
}
