const IV_SETTINGS_KEY = 'pokemon-go-information:iv-checker:v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 既存のPL・相棒・IV設定を保ったまま、個体値チェッカーへ種族IDを引き継ぎます。 */
export function openIvCheckerForSpecies(speciesId: string): void {
  try {
    const raw = window.localStorage.getItem(IV_SETTINGS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const current = isRecord(parsed) ? parsed : {};
    window.localStorage.setItem(
      IV_SETTINGS_KEY,
      JSON.stringify({
        ...current,
        speciesId,
        maxLevel: current.maxLevel === 40 ? 40 : 50,
        buddyBoost: current.buddyBoost === true,
        ivs: isRecord(current.ivs)
          ? current.ivs
          : { attack: 15, defense: 15, hp: 15 },
      }),
    );
  } catch {
    // 保存できない環境でも、ページ遷移自体は行う。
  }
  window.location.hash = '#/iv-checker';
}

export function formatMoveId(moveId: string): string {
  return moveId
    .toLocaleLowerCase('en-US')
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}
