import { useMemo, useState } from 'react';
import { PokemonSelector } from '../components/PokemonSelector';
import { ShadowBadge } from '../components/ShadowBadge';
import { ToolDataStatus } from '../components/ToolDataStatus';
import { TypeBadge } from '../components/TypeBadge';
import { useToolData } from '../hooks/useToolData';
import type { GameMoveData } from '../types/gameData';
import type { Pokemon } from '../types/pokemon';
import { applyShadowAttackModifier } from '../utils/shadow';
import '../styles/tools.css';

interface MoveRowProps {
  move: GameMoveData;
  elite: boolean;
  isShadow: boolean;
}

function metric(value: number | undefined, digits = 1): string {
  return value === undefined
    ? '—'
    : value.toLocaleString('ja-JP', { maximumFractionDigits: digits });
}

export function MoveRow({ move, elite, isShadow }: MoveRowProps) {
  const isFast = move.kind === 'fast';
  return (
    <article className="move-card">
      <header>
        <div>
          <strong>{move.name}</strong>
          <TypeBadge type={move.type} />
        </div>
        {elite ? <span className="tool-badge">すごいわざマシン</span> : null}
      </header>
      <div className="move-metrics">
        <section>
          <h3>ジム・レイド</h3>
          <dl>
            <div><dt>威力</dt><dd>{metric(move.pve?.power, 0)}</dd></div>
            <div><dt>発生時間</dt><dd>{move.pve?.durationMs ? `${metric(move.pve.durationMs / 1000, 2)}秒` : '—'}</dd></div>
            <div><dt>{isFast ? 'エネルギー増加' : '必要エネルギー'}</dt><dd>{move.pve?.energyDelta === undefined ? '—' : metric(Math.abs(move.pve.energyDelta), 0)}</dd></div>
            <div><dt>DPS</dt><dd>{metric(move.pve?.dps, 2)}</dd></div>
            {isShadow && move.pve?.dps !== undefined ? (
              <div className="move-metric--shadow">
                <dt>シャドウ補正後DPS</dt>
                <dd>{metric(applyShadowAttackModifier(move.pve.dps), 2)}</dd>
              </div>
            ) : null}
            {isFast ? <div><dt>EPS</dt><dd>{metric(move.pve?.eps, 2)}</dd></div> : null}
          </dl>
        </section>
        <section>
          <h3>トレーナーバトル</h3>
          <dl>
            <div><dt>威力</dt><dd>{metric(move.pvp?.power, 0)}</dd></div>
            {isFast ? (
              <>
                <div><dt>ターン数</dt><dd>{metric(move.pvp?.turns, 0)}</dd></div>
                <div><dt>エネルギー増加</dt><dd>{metric(move.pvp?.energyDelta, 0)}</dd></div>
                <div><dt>DPT</dt><dd>{metric(move.pvp?.dpt, 2)}</dd></div>
                {isShadow && move.pvp?.dpt !== undefined ? (
                  <div className="move-metric--shadow">
                    <dt>シャドウ補正後DPT</dt>
                    <dd>{metric(applyShadowAttackModifier(move.pvp.dpt), 2)}</dd>
                  </div>
                ) : null}
                <div><dt>EPT</dt><dd>{metric(move.pvp?.ept, 2)}</dd></div>
              </>
            ) : (
              <>
                <div><dt>必要エネルギー</dt><dd>{move.pvp?.energyDelta === undefined ? '—' : metric(Math.abs(move.pvp.energyDelta), 0)}</dd></div>
                <div><dt>DPE</dt><dd>{metric(move.pvp?.dpe, 2)}</dd></div>
                {isShadow && move.pvp?.dpe !== undefined ? (
                  <div className="move-metric--shadow">
                    <dt>シャドウ補正後DPE</dt>
                    <dd>{metric(applyShadowAttackModifier(move.pvp.dpe), 2)}</dd>
                  </div>
                ) : null}
              </>
            )}
          </dl>
        </section>
      </div>
    </article>
  );
}

export function MoveCheckerPage() {
  const toolData = useToolData();
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const selectedPokemon = useMemo(
    () => toolData.pokemon.find((entry) => entry.speciesId === speciesId) ?? null,
    [speciesId, toolData.pokemon],
  );
  const pokemonMoves = speciesId && toolData.gameData
    ? toolData.gameData.pokemon[speciesId]
    : undefined;
  const fastMoves = useMemo(() => {
    if (!pokemonMoves || !toolData.gameData) return [];
    return [...new Set([...pokemonMoves.fastMoveIds, ...pokemonMoves.eliteFastMoveIds])].flatMap((id) => {
      const move = toolData.gameData?.moves[id];
      return move ? [{ move, elite: pokemonMoves.eliteFastMoveIds.includes(id) }] : [];
    });
  }, [pokemonMoves, toolData.gameData]);
  const chargedMoves = useMemo(() => {
    if (!pokemonMoves || !toolData.gameData) return [];
    return [...new Set([...pokemonMoves.chargedMoveIds, ...pokemonMoves.eliteChargedMoveIds])].flatMap((id) => {
      const move = toolData.gameData?.moves[id];
      return move ? [{ move, elite: pokemonMoves.eliteChargedMoveIds.includes(id) }] : [];
    });
  }, [pokemonMoves, toolData.gameData]);

  return (
    <div className="tool-page move-checker-page">
      <header className="page-heading">
        <div>
          <h1>わざ性能</h1>
        </div>
      </header>

      <ToolDataStatus loading={toolData.loading} error={toolData.error} onRetry={toolData.retry} />
      <section className="tool-card move-picker-card">
        <PokemonSelector
          pokemon={toolData.pokemon}
          selectedPokemon={selectedPokemon}
          loading={toolData.loading}
          error={toolData.error}
          onSelect={(pokemon: Pokemon) => setSpeciesId(pokemon.speciesId)}
          onRetry={toolData.retry}
          idleHint={null}
        />
        {pokemonMoves ? (
          <div className="pokemon-type-list" aria-label="ポケモンのタイプ">
            {pokemonMoves.types.map((type) => <TypeBadge key={type} type={type} />)}
            {selectedPokemon?.isShadow ? <ShadowBadge /> : null}
          </div>
        ) : null}
      </section>

      {selectedPokemon?.isShadow && pokemonMoves ? (
        <div className="tool-notice shadow-move-notice" role="status">
          シャドウポケモンはバトル時に与えるダメージが×1.2になる一方、受けるダメージも増加します。わざの基礎威力・エネルギー等は通常版と同じです。
        </div>
      ) : null}

      {!selectedPokemon ? <p className="tool-empty tool-card">ポケモンを選択してください。</p> : null}
      {selectedPokemon && !pokemonMoves ? (
        <p className="tool-empty tool-card">このフォルムの技データは安全に対応付けできませんでした。</p>
      ) : null}
      {pokemonMoves ? (
        <div className="move-sections">
          <section>
            <h2>通常技</h2>
            <div className="move-list">
              {fastMoves.map(({ move, elite }) => <MoveRow key={move.id} move={move} elite={elite} isShadow={selectedPokemon?.isShadow === true} />)}
            </div>
          </section>
          <section>
            <h2>ゲージ技</h2>
            <div className="move-list">
              {chargedMoves.map(({ move, elite }) => <MoveRow key={move.id} move={move} elite={elite} isShadow={selectedPokemon?.isShadow === true} />)}
            </div>
          </section>
        </div>
      ) : null}

      <p className="tool-notice">
        「すごいわざマシン」はGame Masterのelite move項目で確認できた技だけに表示します。通常のわざマシン可否やイベント限定期間は判定していません。
      </p>
      <p className="data-credit tool-credit">
        Data provided by <a href="https://github.com/PokeMiners/game_masters" target="_blank" rel="noreferrer">PokeMiners Game Master</a>
        {' / '}<a href="https://github.com/PokeMiners/pogo_assets" target="_blank" rel="noreferrer">PokeMiners Pokémon GO Assets</a>
      </p>
    </div>
  );
}
