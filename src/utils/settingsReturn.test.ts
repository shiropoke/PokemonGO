import { describe, expect, it } from 'vitest';
import { resolveSettingsReturnHash } from './settingsReturn';

describe('settings return hash', () => {
  it('直前のページとqueryを維持する', () => {
    expect(resolveSettingsReturnHash('#/pokefuta?pref=osaka')).toBe('#/pokefuta?pref=osaka');
  });

  it('settings直リンクや不明な戻り先はホームへfallbackする', () => {
    expect(resolveSettingsReturnHash('#/settings')).toBe('#/home');
    expect(resolveSettingsReturnHash(null)).toBe('#/home');
  });
});
