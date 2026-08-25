import { describe, expect, it } from 'vitest';
import {
  createRocketDialogueIdentity,
  dedupeDialogues,
  extractLeekDuckEntries,
  extractSerebiiMixedDialogues,
  mergeMixedGruntDialogues,
  normalizeDialogue,
} from './rocket-dialogue-utils.mjs';
import {
  createLocalizationCatalog,
  localizeRocketDialogueEntries,
  normalizeLocalizationText,
  parsePokeMinersLocalization,
} from './pokeminers-localization-utils.mjs';

function profile(name, title, type, dialogues) {
  const typeMarkup = type ? `<span class="type"><img alt="${type} type"></span>` : '';
  return `<div class="rocket-profile">
    <div class="employee-info">
      <div class="name">${name}</div><div class="title">${title}</div>
      ${typeMarkup}
      <span class="quote">${dialogues.map((dialogue) => `<span class="quote-text">${dialogue}</span>`).join('')}</span>
    </div>
  </div>`;
}

const LEEK_HTML = [
  profile('Fire-type Female Grunt', 'Team GO Rocket Grunt', 'Fire', ['Hot&nbsp; flames!']),
  profile('Water-type Male Grunt', 'Team GO Rocket Grunt', 'Water', ['Male water line.']),
  profile('Water-type Female Grunt', 'Team GO Rocket Grunt', 'Water', ['Female water line.']),
  profile('Male&nbsp;Grunt', 'Team GO Rocket Grunt', null, ['Shared mixed line.']),
  profile('Female Grunt', 'Team GO Rocket Grunt', null, ['Shared mixed line.']),
  profile('Decoy Female Grunt', 'Team GO Rocket Grunt', null, ['Decoy only.']),
  profile('Cliff', 'Team GO Rocket Leader', null, ['Leader only.']),
  profile('Giovanni', 'Team GO Rocket Boss', null, ['Boss only.']),
].join('');

const SEREBII_HTML = `<table><tr><td>Mixed</td><td>
  Shared mixed line.<br>Second mixed line.<br>Third mixed line.
</td></tr></table>`;

describe('Rocket dialogue generator utilities', () => {
  it('余分な空白とHTML markupを除去する', () => {
    expect(normalizeDialogue('  <b>Ready&nbsp; now</b>\n<script>bad()</script>  '))
      .toBe('Ready now');
  });

  it('正規化後に同一となるセリフを重複させない', () => {
    expect(dedupeDialogues(['Ready   now', '<span>Ready&nbsp; now</span>']))
      .toEqual(['Ready now']);
  });

  it('typed grunt・Water男女・Decoy・Leader・Giovanniを別identityで抽出する', () => {
    const entries = extractLeekDuckEntries(LEEK_HTML);
    expect(entries).toHaveLength(8);
    expect(entries.find((entry) => entry.trainerName === 'Fire-type Female Grunt'))
      .toMatchObject({ type: 'fire', dialogues: ['Hot flames!'] });
    expect(entries.filter((entry) => entry.type === 'water').map((entry) => entry.trainerName))
      .toEqual(['Water-type Male Grunt', 'Water-type Female Grunt']);
    expect(entries.find((entry) => entry.trainerName === 'Decoy Female Grunt')?.dialogues)
      .toEqual(['Decoy only.']);
    expect(entries.find((entry) => entry.trainerName === 'Cliff')?.title)
      .toBe('Team GO Rocket Leader');
    expect(entries.find((entry) => entry.trainerName === 'Giovanni')?.title)
      .toBe('Team GO Rocket Boss');
  });

  it('profile classが変わってもname・title・quoteの関係から抽出する', () => {
    const changedMarkup = profile(
      'Bug-type Male Grunt',
      'Team GO Rocket Grunt',
      'Bug',
      ['Bug line.'],
    ).replace('rocket-profile', 'trainer-card');
    expect(extractLeekDuckEntries(changedMarkup)[0]).toMatchObject({
      trainerName: 'Bug-type Male Grunt',
      type: 'bug',
      dialogues: ['Bug line.'],
    });
  });

  it('タイプなし男女へ複数セリフを補完し、Decoyへは混ぜない', () => {
    const entries = extractLeekDuckEntries(LEEK_HTML);
    const mixed = extractSerebiiMixedDialogues(SEREBII_HTML);
    const merged = mergeMixedGruntDialogues(entries, mixed);
    expect(mixed).toHaveLength(3);
    expect(merged.find((entry) => entry.trainerName === 'Male Grunt')?.dialogues).toHaveLength(3);
    expect(merged.find((entry) => entry.trainerName === 'Female Grunt')?.dialogues).toHaveLength(3);
    expect(merged.find((entry) => entry.trainerName === 'Decoy Female Grunt')?.dialogues)
      .toEqual(['Decoy only.']);
  });

  it('NBSPを含むidentityを同一化する', () => {
    expect(createRocketDialogueIdentity({
      title: ' Team GO Rocket Grunt ',
      trainerName: 'Water-type Male\u00a0Grunt',
      type: 'water',
    })).toBe('team go rocket grunt::water-type male grunt::water');
  });
});

describe('PokeMiners Rocket dialogue localization', () => {
  const localization = (rows) => rows
    .map(([key, text]) => `RESOURCE ID: ${key}\nTEXT: ${text}\n`)
    .join('\n');

  it('RESOURCE ID単位で読み、句読点差を正規化する', () => {
    const parsed = parsePokeMinersLocalization(localization([
      ['combat_grunt_quote#2__male_speaker', 'いちおう戦ってみるかー。'],
    ]));
    expect(parsed.get('combat_grunt_quote#2__male_speaker')).toBe('いちおう戦ってみるかー。');
    expect(normalizeLocalizationText("Don’t bother—I’ve already won.")).toBe(
      normalizeLocalizationText("Don't bother, I've already won"),
    );
  });

  it('タイプ・性別を厳密に選び、強力男女・おとり・Leaderの複数セリフを維持する', () => {
    const englishRows = [
      ['combat_grunt_quote_water__male_speaker', 'These waters are treacherous!'],
      ['combat_grunt_quote_water__female_speaker', 'These waters are treacherous!'],
      ['combat_grunt_quote#1__male_speaker', 'Winning is for winners.'],
      ['combat_grunt_quote#2__male_speaker', 'Don’t bother—I’ve already won.'],
      ['combat_grunt_quote#3__male_speaker', 'Get ready to be defeated!'],
      ['combat_grunt_decoy_quote#1', 'Fooled ya, twerp.'],
      ['combat_grunt_decoy_quote#2', 'I can’t believe you fell for it!'],
      ['combat_arlo_quote#1', 'It’s time to learn your place in the world.'],
      ['combat_arlo_quote#2', 'I never lose.'],
    ];
    const japaneseRows = englishRows.map(([key], index) => [key, `日本語セリフ${index + 1}`]);
    const catalog = createLocalizationCatalog([{
      name: 'Latest APK',
      englishEntries: parsePokeMinersLocalization(localization(englishRows)),
      japaneseEntries: parsePokeMinersLocalization(localization(japaneseRows)),
    }]);
    const grunt = 'Team GO Rocket Grunt';
    const entries = [
      { trainerName: 'Water-type Male Grunt', title: grunt, type: 'water', dialogues: ['These waters are treacherous!'] },
      { trainerName: 'Water-type Female Grunt', title: grunt, type: 'water', dialogues: ['These waters are treacherous!'] },
      { trainerName: 'Male Grunt', title: grunt, type: null, dialogues: ['Winning is for winners.', "Don't bother, I've already won", 'Get ready to be defeated!'] },
      { trainerName: 'Decoy Female Grunt', title: grunt, type: null, dialogues: ['Fooled ya, twerp.'] },
      { trainerName: 'Arlo', title: 'Team GO Rocket Leader', type: null, dialogues: ["It's time to learn your place in the world."] },
    ].map((entry) => ({ ...entry, identity: createRocketDialogueIdentity(entry) }));
    const localized = localizeRocketDialogueEntries(entries, catalog);

    expect(localized[0]?.dialogues).toEqual(['日本語セリフ1']);
    expect(localized[1]?.dialogues).toEqual(['日本語セリフ2']);
    expect(localized[2]?.dialogues).toHaveLength(3);
    expect(localized[3]?.dialogues).toHaveLength(2);
    expect(localized[4]?.dialogues).toHaveLength(2);
    expect(localized.flatMap((entry) => entry.dialogues).some((text) => /[A-Za-z]{3}/.test(text))).toBe(false);
  });
});
