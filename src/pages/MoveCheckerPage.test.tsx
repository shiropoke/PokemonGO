import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GameMoveData } from '../types/gameData';
import { MoveRow } from './MoveCheckerPage';

const FAST_MOVE: GameMoveData = {
  id: 'TEST_FAST',
  name: 'テスト技',
  type: 'electric',
  kind: 'fast',
  pve: {
    power: 5,
    durationMs: 500,
    energyDelta: 8,
    dps: 10,
    eps: 16,
  },
  pvp: {
    power: 6,
    turns: 2,
    energyDelta: 8,
    dpt: 3,
    ept: 4,
  },
};

const CHARGED_MOVE: GameMoveData = {
  id: 'TEST_CHARGED',
  name: 'テストゲージ技',
  type: 'electric',
  kind: 'charged',
  pve: {
    power: 100,
    durationMs: 2500,
    energyDelta: -50,
    dps: 40,
  },
  pvp: {
    power: 90,
    energyDelta: -45,
    dpe: 2,
  },
};

describe('MoveRow Shadow reference values', () => {
  it('通常ポケモンではShadow補正値を表示しない', () => {
    const markup = renderToStaticMarkup(
      <MoveRow move={FAST_MOVE} elite={false} isShadow={false} />,
    );
    expect(markup).not.toContain('シャドウ補正後');
  });

  it('Shadowでもraw値を維持し、DPS/DPTだけ補正後参考値を追加する', () => {
    const markup = renderToStaticMarkup(
      <MoveRow move={FAST_MOVE} elite={false} isShadow />,
    );
    expect(markup).toContain('<dt>威力</dt><dd>5</dd>');
    expect(markup).toContain('<dt>発生時間</dt><dd>0.5秒</dd>');
    expect(markup).toContain('<dt>エネルギー増加</dt><dd>8</dd>');
    expect(markup).toContain('<dt>DPS</dt><dd>10</dd>');
    expect(markup).toContain('シャドウ補正後DPS</dt><dd>12</dd>');
    expect(markup).toContain('<dt>DPT</dt><dd>3</dd>');
    expect(markup).toContain('シャドウ補正後DPT</dt><dd>3.6</dd>');
    expect(markup).toContain('<dt>EPT</dt><dd>4</dd>');
  });

  it('ゲージ技の必要エネルギーを変えず、DPEの参考値だけを追加する', () => {
    const markup = renderToStaticMarkup(
      <MoveRow move={CHARGED_MOVE} elite={false} isShadow />,
    );
    expect(markup).toContain('<dt>必要エネルギー</dt><dd>45</dd>');
    expect(markup).toContain('<dt>DPE</dt><dd>2</dd>');
    expect(markup).toContain('シャドウ補正後DPE</dt><dd>2.4</dd>');
  });
});
