import { describe, expect, it } from 'vitest';
import type { RocketDialogueEntry } from '../types/rocketDialogues';
import type { RocketLineup } from '../types/scrapedDuck';
import {
  createRocketDialogueIdentity,
  joinRocketDialogues,
  normalizeRocketDialogueDataset,
} from './rocketDialogues';

function lineup(name: string, title: string, type: string | null): RocketLineup {
  return {
    id: name,
    name,
    displayName: name,
    title,
    titleLabel: title,
    type,
    dialogues: [],
    firstPokemon: [],
    secondPokemon: [],
    thirdPokemon: [],
  };
}

function dialogueEntry(
  trainerName: string,
  title: string,
  type: string | null,
  dialogues: string[],
): RocketDialogueEntry {
  return {
    identity: createRocketDialogueIdentity({ trainerName, title, type }),
    trainerName,
    title,
    type,
    dialogues,
  };
}

describe('Rocket dialogue runtime integration', () => {
  it('外部JSONを正規化し、空白と重複を除去してidentityを再生成する', () => {
    const dataset = normalizeRocketDialogueDataset({
      schemaVersion: 2,
      generatedAt: '2026-08-25T00:00:00.000Z',
      source: 'https://leekduck.com/rocket-lineups/',
      supplementalSources: ['https://www.serebii.net/pokemongo/teamgorocket.shtml'],
      localizationSources: ['https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/Japanese.txt'],
      entries: [{
        identity: 'untrusted',
        trainerName: 'Water-type Male\u00a0Grunt',
        title: 'Team GO Rocket Grunt',
        type: 'WATER',
        dialogues: ['  Water line. ', 'Water   line.'],
      }],
    });

    expect(dataset?.entries[0]).toMatchObject({
      identity: 'team go rocket grunt::water-type male grunt::water',
      type: 'water',
      dialogues: ['Water line.'],
    });
  });

  it('旧schemaの英語fallbackを受理しない', () => {
    expect(normalizeRocketDialogueDataset({
      schemaVersion: 1,
      generatedAt: '2026-08-25T00:00:00.000Z',
      source: 'https://leekduck.com/rocket-lineups/',
      entries: [],
    })).toBeNull();
  });

  it('typed grunt・Water男女・mixed男女・Decoy・Leader・Giovanniへ厳密joinする', () => {
    const gruntTitle = 'Team GO Rocket Grunt';
    const leaderTitle = 'Team GO Rocket Leader';
    const bossTitle = 'Team GO Rocket Boss';
    const lineups = [
      lineup('Fire-type Female Grunt', gruntTitle, 'fire'),
      lineup('Water-type Male Grunt', gruntTitle, 'water'),
      lineup('Water-type Female Grunt', gruntTitle, 'water'),
      lineup('Male Grunt', gruntTitle, null),
      lineup('Female Grunt', gruntTitle, null),
      lineup('Decoy Female Grunt', gruntTitle, null),
      lineup('Cliff', leaderTitle, null),
      lineup('Giovanni', bossTitle, null),
      lineup('Future Trainer', leaderTitle, null),
    ];
    const entries = [
      dialogueEntry('Fire-type Female Grunt', gruntTitle, 'fire', ['Fire line.']),
      dialogueEntry('Water-type Male Grunt', gruntTitle, 'water', ['Water male line.']),
      dialogueEntry('Water-type Female Grunt', gruntTitle, 'water', ['Water female line.']),
      dialogueEntry('Male Grunt', gruntTitle, null, ['Mixed 1.', 'Mixed 2.', 'Mixed 3.']),
      dialogueEntry('Female Grunt', gruntTitle, null, ['Mixed 1.', 'Mixed 2.', 'Mixed 3.']),
      dialogueEntry('Decoy Female Grunt', gruntTitle, null, ['Decoy line.']),
      dialogueEntry('Cliff', leaderTitle, null, ['Leader line.']),
      dialogueEntry('Giovanni', bossTitle, null, ['Boss line.']),
    ];
    const joined = joinRocketDialogues(lineups, entries);

    expect(joined[0]?.dialogues).toEqual(['Fire line.']);
    expect(joined[1]?.dialogues).toEqual(['Water male line.']);
    expect(joined[2]?.dialogues).toEqual(['Water female line.']);
    expect(joined[3]?.dialogues).toHaveLength(3);
    expect(joined[4]?.dialogues).toHaveLength(3);
    expect(joined[5]?.dialogues).toEqual(['Decoy line.']);
    expect(joined[6]?.dialogues).toEqual(['Leader line.']);
    expect(joined[7]?.dialogues).toEqual(['Boss line.']);
    expect(joined[8]?.dialogues).toEqual([]);
  });
});
