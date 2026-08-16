import type { IndividualValues, League, StandardMaxLevel } from '../types/calculations';
import { IvSelector } from './IvSelector';
import { SegmentedControl } from './SegmentedControl';

const MAX_LEVEL_OPTIONS = [
  { value: 40 as const, label: 'PL40' },
  { value: 50 as const, label: 'PL50' },
];

const BUDDY_OPTIONS = [
  { value: 'off' as const, label: 'なし' },
  { value: 'on' as const, label: 'あり' },
];

const LEAGUE_OPTIONS = [
  { value: 'great' as const, label: 'スーパー' },
  { value: 'ultra' as const, label: 'ハイパー' },
  { value: 'master' as const, label: 'マスター' },
];

interface IvInputPanelProps {
  maxLevel: StandardMaxLevel;
  buddyBoost: boolean;
  effectiveLevelCap: number;
  league: League;
  cp: string;
  ivs: IndividualValues;
  onMaxLevelChange: (value: StandardMaxLevel) => void;
  onBuddyBoostChange: (value: boolean) => void;
  onLeagueChange: (value: League) => void;
  onCpChange: (value: string) => void;
  onIvsChange: (value: IndividualValues) => void;
}

export function IvInputPanel({
  maxLevel,
  buddyBoost,
  effectiveLevelCap,
  league,
  cp,
  ivs,
  onMaxLevelChange,
  onBuddyBoostChange,
  onLeagueChange,
  onCpChange,
  onIvsChange,
}: IvInputPanelProps) {
  return (
    <section className="checker-input-card" aria-labelledby="checker-settings-title">
      <h2 id="checker-settings-title">強化条件</h2>
      <div className="checker-settings-grid">
        <SegmentedControl
          label="最大PL"
          value={maxLevel}
          options={MAX_LEVEL_OPTIONS}
          onChange={onMaxLevelChange}
        />
        <SegmentedControl
          label="相棒ブースト"
          value={buddyBoost ? 'on' : 'off'}
          options={BUDDY_OPTIONS}
          onChange={(value) => onBuddyBoostChange(value === 'on')}
        />
      </div>

      <p className="effective-level" aria-live="polite">
        計算上限 <strong>PL{effectiveLevelCap}</strong>{buddyBoost ? ' 相棒' : ''}
      </p>

      <label className="cp-input">
        <span>CP（任意）</span>
        <span className="cp-input__control">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={cp}
            onChange={(event) => {
              const nextValue = event.target.value.replace(/\D/g, '').slice(0, 6);
              onCpChange(nextValue);
            }}
            placeholder="例：1498"
            aria-describedby="cp-input-hint"
          />
          {cp ? (
            <button type="button" onClick={() => onCpChange('')} aria-label="CPをクリア">
              クリア
            </button>
          ) : null}
        </span>
        <small id="cp-input-hint">入力すると現在のPL候補を探します</small>
      </label>

      <div className="iv-inputs">
        <IvSelector
          label="攻撃"
          value={ivs.attack}
          tone="attack"
          onChange={(attack) => onIvsChange({ ...ivs, attack })}
        />
        <IvSelector
          label="防御"
          value={ivs.defense}
          tone="defense"
          onChange={(defense) => onIvsChange({ ...ivs, defense })}
        />
        <IvSelector
          label="HP"
          value={ivs.hp}
          tone="hp"
          onChange={(hp) => onIvsChange({ ...ivs, hp })}
        />
      </div>

      <SegmentedControl
        label="リーグ"
        value={league}
        options={LEAGUE_OPTIONS}
        onChange={onLeagueChange}
        className="league-selector"
      />
    </section>
  );
}

