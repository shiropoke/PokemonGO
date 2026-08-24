import { useEffect, useMemo, useState } from 'react';
import { IvInputPanel } from '../components/IvInputPanel';
import { IvResults } from '../components/IvResults';
import { FavoriteButton } from '../components/FavoriteButton';
import { EvolutionPvpResults } from '../components/EvolutionPvpResults';
import { PokemonSelector } from '../components/PokemonSelector';
import { fetchGameData } from '../services/gameData';
import { fetchPokemonData } from '../services/pokemonData';
import type {
  IndividualValues,
  League,
  PvpRankResult,
  StandardMaxLevel,
} from '../types/calculations';
import type { Pokemon, PokemonDataSource } from '../types/pokemon';
import type { GameData } from '../types/gameData';
import { getHashQueryParam } from '../types/navigation';
import { findMatchingLevels, getEffectiveLevelCap } from '../utils/cp';
import { calculateIvSummary } from '../utils/iv';
import { getPvpRankResult } from '../utils/pvp';
import { getEvolutionDescendants } from '../utils/evolutionChain';
import { calculateEvolutionPvpResults } from '../utils/evolutionPvp';

const SETTINGS_KEY = 'pokemon-go-information:iv-checker:v1';

interface CheckerSettings {
  speciesId: string | null;
  maxLevel: StandardMaxLevel;
  buddyBoost: boolean;
  ivs: IndividualValues;
}

interface PokemonLoadState {
  pokemon: Pokemon[];
  fetchedAt: number | null;
  source: PokemonDataSource | null;
  loading: boolean;
  error: string | null;
}

interface EvolutionDataState {
  gameData: GameData | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_SETTINGS: CheckerSettings = {
  speciesId: null,
  maxLevel: 50,
  buddyBoost: false,
  ivs: { attack: 15, defense: 15, hp: 15 },
};

const LEAGUES = ['great', 'ultra', 'master'] as const satisfies readonly League[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readIv(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 15
    ? value
    : fallback;
}

function loadSettings(): CheckerSettings {
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    const value: unknown = JSON.parse(stored);
    if (!isRecord(value)) return DEFAULT_SETTINGS;

    const rawIvs = isRecord(value.ivs) ? value.ivs : {};

    return {
      speciesId: typeof value.speciesId === 'string' ? value.speciesId : null,
      maxLevel: value.maxLevel === 40 ? 40 : 50,
      buddyBoost: value.buddyBoost === true,
      ivs: {
        attack: readIv(rawIvs.attack, DEFAULT_SETTINGS.ivs.attack),
        defense: readIv(rawIvs.defense, DEFAULT_SETTINGS.ivs.defense),
        hp: readIv(rawIvs.hp, DEFAULT_SETTINGS.ivs.hp),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: CheckerSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // localStorage が利用できない環境でもチェッカー自体は継続して使える。
  }
}

function getLinkedSpeciesId(): string | null {
  const speciesId = getHashQueryParam(window.location.hash, 'species')?.trim() ?? '';
  return /^[a-z0-9_-]+$/i.test(speciesId) ? speciesId.toLowerCase() : null;
}

function formatDataTime(timestamp: number): string {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function IvCheckerPage() {
  const [settings, setSettings] = useState<CheckerSettings>(loadSettings);
  const [cp, setCp] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);
  const [dataState, setDataState] = useState<PokemonLoadState>({
    pokemon: [],
    fetchedAt: null,
    source: null,
    loading: true,
    error: null,
  });
  const [evolutionDataState, setEvolutionDataState] = useState<EvolutionDataState>({
    gameData: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const syncLinkedSpecies = () => {
      const linkedSpeciesId = getLinkedSpeciesId();
      if (linkedSpeciesId) {
        setSettings((current) =>
          current.speciesId === linkedSpeciesId
            ? current
            : { ...current, speciesId: linkedSpeciesId },
        );
      }
    };
    syncLinkedSpecies();
    window.addEventListener('hashchange', syncLinkedSpecies);
    return () => window.removeEventListener('hashchange', syncLinkedSpecies);
  }, []);

  useEffect(() => {
    let ignore = false;
    setDataState((current) => ({ ...current, loading: true, error: null }));

    void fetchPokemonData({
      force: requestVersion > 0,
    })
      .then((result) => {
        if (ignore) return;
        setDataState({
          pokemon: result.pokemon,
          fetchedAt: result.fetchedAt,
          source: result.source,
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        if (ignore) return;
        setDataState((current) => ({
          ...current,
          loading: false,
          error: 'ポケモンデータを取得できませんでした',
        }));
      });

    // StrictMode の再マウント時も、共有中の大きなJSON取得自体は中断しない。
    return () => {
      ignore = true;
    };
  }, [requestVersion]);

  useEffect(() => {
    let ignore = false;
    setEvolutionDataState((current) => ({ ...current, loading: true, error: null }));

    void fetchGameData({ force: requestVersion > 0 })
      .then((gameData) => {
        if (ignore) return;
        setEvolutionDataState({ gameData, loading: false, error: null });
      })
      .catch(() => {
        if (ignore) return;
        setEvolutionDataState((current) => ({
          ...current,
          loading: false,
          error: '進化データを取得できませんでした',
        }));
      });

    // 進化データの失敗は、既存の個体値チェッカーを利用不能にしない。
    return () => {
      ignore = true;
    };
  }, [requestVersion]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const selectedPokemon = useMemo(
    () => dataState.pokemon.find((entry) => entry.speciesId === settings.speciesId) ?? null,
    [dataState.pokemon, settings.speciesId],
  );

  const pokemonById = useMemo(
    () => new Map(dataState.pokemon.map((pokemon) => [pokemon.speciesId, pokemon])),
    [dataState.pokemon],
  );

  const effectiveLevelCap = useMemo(
    () => getEffectiveLevelCap(settings.maxLevel, settings.buddyBoost),
    [settings.maxLevel, settings.buddyBoost],
  );

  const ivSummary = useMemo(() => calculateIvSummary(settings.ivs), [settings.ivs]);
  const enteredCp = cp === '' ? null : Number(cp);

  const matchingLevels = useMemo(() => {
    if (!selectedPokemon || enteredCp === null || !Number.isFinite(enteredCp)) return [];
    try {
      return findMatchingLevels(
        selectedPokemon.baseStats,
        settings.ivs,
        enteredCp,
        effectiveLevelCap,
      );
    } catch {
      return [];
    }
  }, [effectiveLevelCap, enteredCp, selectedPokemon, settings.ivs]);

  const leagueCalculations = useMemo<{
    pvpResults: Record<League, PvpRankResult | null>;
    error: string | null;
  }>(() => {
    const pvpResults: Record<League, PvpRankResult | null> = {
      great: null,
      ultra: null,
      master: null,
    };

    if (!selectedPokemon) {
      return { pvpResults, error: null };
    }

    let calculationFailed = false;
    for (const league of LEAGUES) {
      try {
        // ランキング表はbaseStats・リーグ・PL上限ごとにpvp.ts内で
        // キャッシュされるため、IV変更時は4096通りを再計算しない。
        pvpResults[league] = getPvpRankResult(
          selectedPokemon.baseStats,
          settings.ivs,
          league,
          effectiveLevelCap,
        );
      } catch {
        calculationFailed = true;
      }
    }

    return {
      pvpResults,
      error: calculationFailed
        ? '一部のリーグ計算結果を表示できませんでした'
        : null,
    };
  }, [effectiveLevelCap, selectedPokemon, settings.ivs]);

  const evolutionDescendants = useMemo(() => {
    if (!selectedPokemon || !evolutionDataState.gameData) return [];
    return getEvolutionDescendants(
      selectedPokemon.speciesId,
      evolutionDataState.gameData,
      pokemonById,
    );
  }, [evolutionDataState.gameData, pokemonById, selectedPokemon]);

  const evolutionPvpResults = useMemo(
    () => calculateEvolutionPvpResults(
      evolutionDescendants,
      settings.ivs,
      effectiveLevelCap,
    ),
    [effectiveLevelCap, evolutionDescendants, settings.ivs],
  );

  return (
    <div className="iv-checker-page">
      <header className="page-heading">
        <div>
          <span className="page-kicker">個体値・PvP計算</span>
          <h1>個体値チェッカー</h1>
          <p>個体値と強化条件から3リーグのPvP順位をまとめて確認できます。</p>
        </div>
      </header>

      <div className="checker-layout">
        <div className="checker-controls">
          <PokemonSelector
            pokemon={dataState.pokemon}
            selectedPokemon={selectedPokemon}
            loading={dataState.loading}
            error={dataState.error}
            onSelect={(entry) => {
              setSettings((current) => ({ ...current, speciesId: entry.speciesId }));
            }}
            onRetry={() => setRequestVersion((version) => version + 1)}
          />

          {selectedPokemon ? (
            <div className="selected-pokemon-actions">
              <FavoriteButton
                speciesId={selectedPokemon.speciesId}
                displayName={selectedPokemon.displayName}
              />
            </div>
          ) : null}

          {dataState.fetchedAt ? (
            <p className="pokemon-data-meta">
              データ更新 {formatDataTime(dataState.fetchedAt)}
              {dataState.source === 'stale-cache' ? '（保存済みデータ）' : ''}
            </p>
          ) : null}

          <IvInputPanel
            maxLevel={settings.maxLevel}
            buddyBoost={settings.buddyBoost}
            effectiveLevelCap={effectiveLevelCap}
            cp={cp}
            ivs={settings.ivs}
            onMaxLevelChange={(maxLevel) => {
              setSettings((current) => ({ ...current, maxLevel }));
            }}
            onBuddyBoostChange={(buddyBoost) => {
              setSettings((current) => ({ ...current, buddyBoost }));
            }}
            onCpChange={setCp}
            onIvsChange={(ivs) => {
              setSettings((current) => ({ ...current, ivs }));
            }}
          />
        </div>

        <div className="checker-result-column">
          <IvResults
            summary={ivSummary}
            pokemonSelected={selectedPokemon !== null}
            cpWasEntered={enteredCp !== null}
            matchingLevels={matchingLevels}
            pvpResults={leagueCalculations.pvpResults}
            calculationError={leagueCalculations.error}
          />
          <EvolutionPvpResults
            results={evolutionPvpResults}
            pokemonSelected={selectedPokemon !== null}
            loading={evolutionDataState.loading}
            error={evolutionDataState.error}
          />
          {selectedPokemon ? (
            <div className="checker-tool-links">
              <a href={`#/evolution-cp?species=${encodeURIComponent(selectedPokemon.speciesId)}&level=${matchingLevels[0] ?? 25}&attack=${settings.ivs.attack}&defense=${settings.ivs.defense}&hp=${settings.ivs.hp}${enteredCp ? `&cp=${enteredCp}` : ''}`}>
                進化後CPを見る
              </a>
              <a href={`#/power-up?species=${encodeURIComponent(selectedPokemon.speciesId)}&level=${matchingLevels[0] ?? 20}`}>
                強化コストを見る
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <p className="data-credit iv-data-credit">
        基礎ステータス：{' '}
        <a href="https://github.com/pvpoke/pvpoke" target="_blank" rel="noreferrer">
          PvPoke Game Master
        </a>
      </p>
    </div>
  );
}
