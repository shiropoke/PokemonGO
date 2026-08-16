import { useEffect, useMemo, useState } from 'react';
import { IvInputPanel } from '../components/IvInputPanel';
import { IvResults } from '../components/IvResults';
import { PokemonSelector } from '../components/PokemonSelector';
import { fetchPokemonData } from '../services/pokemonData';
import type {
  IndividualValues,
  League,
  MasterLeagueResult,
  PvpRankResult,
  StandardMaxLevel,
} from '../types/calculations';
import type { Pokemon, PokemonDataSource } from '../types/pokemon';
import { findMatchingLevels, getEffectiveLevelCap } from '../utils/cp';
import { calculateIvSummary } from '../utils/iv';
import { calculateMasterLeagueStats, getPvpRankResult } from '../utils/pvp';

const SETTINGS_KEY = 'pokemon-go-information:iv-checker:v1';

interface CheckerSettings {
  speciesId: string | null;
  maxLevel: StandardMaxLevel;
  buddyBoost: boolean;
  league: League;
  ivs: IndividualValues;
}

interface PokemonLoadState {
  pokemon: Pokemon[];
  fetchedAt: number | null;
  source: PokemonDataSource | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_SETTINGS: CheckerSettings = {
  speciesId: null,
  maxLevel: 50,
  buddyBoost: false,
  league: 'great',
  ivs: { attack: 15, defense: 15, hp: 15 },
};

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
    const league = value.league;

    return {
      speciesId: typeof value.speciesId === 'string' ? value.speciesId : null,
      maxLevel: value.maxLevel === 40 ? 40 : 50,
      buddyBoost: value.buddyBoost === true,
      league: league === 'ultra' || league === 'master' ? league : 'great',
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
    saveSettings(settings);
  }, [settings]);

  const selectedPokemon = useMemo(
    () => dataState.pokemon.find((entry) => entry.speciesId === settings.speciesId) ?? null,
    [dataState.pokemon, settings.speciesId],
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

  const leagueCalculation = useMemo<{
    pvpResult: PvpRankResult | null;
    masterResult: MasterLeagueResult | null;
    error: string | null;
  }>(() => {
    if (!selectedPokemon) {
      return { pvpResult: null, masterResult: null, error: null };
    }

    try {
      if (settings.league === 'master') {
        return {
          pvpResult: null,
          masterResult: calculateMasterLeagueStats(
            selectedPokemon.baseStats,
            settings.ivs,
            effectiveLevelCap,
          ),
          error: null,
        };
      }

      return {
        pvpResult: getPvpRankResult(
          selectedPokemon.baseStats,
          settings.ivs,
          settings.league,
          effectiveLevelCap,
        ),
        masterResult: null,
        error: null,
      };
    } catch {
      return {
        pvpResult: null,
        masterResult: null,
        error: 'このポケモンの計算結果を表示できませんでした',
      };
    }
  }, [effectiveLevelCap, selectedPokemon, settings.ivs, settings.league]);

  return (
    <div className="iv-checker-page">
      <header className="page-heading">
        <div>
          <span className="page-kicker">個体値・PvP計算</span>
          <h1>個体値チェッカー</h1>
          <p>個体値と強化条件からPvP順位を確認できます。</p>
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
            league={settings.league}
            cp={cp}
            ivs={settings.ivs}
            onMaxLevelChange={(maxLevel) => {
              setSettings((current) => ({ ...current, maxLevel }));
            }}
            onBuddyBoostChange={(buddyBoost) => {
              setSettings((current) => ({ ...current, buddyBoost }));
            }}
            onLeagueChange={(league) => {
              setSettings((current) => ({ ...current, league }));
            }}
            onCpChange={setCp}
            onIvsChange={(ivs) => {
              setSettings((current) => ({ ...current, ivs }));
            }}
          />
        </div>

        <IvResults
          summary={ivSummary}
          league={settings.league}
          pokemonSelected={selectedPokemon !== null}
          cpWasEntered={enteredCp !== null}
          matchingLevels={matchingLevels}
          pvpResult={leagueCalculation.pvpResult}
          masterResult={leagueCalculation.masterResult}
          calculationError={leagueCalculation.error}
        />
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
