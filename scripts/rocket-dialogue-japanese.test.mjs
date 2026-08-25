import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { isLikelyEnglishSentence } from './pokeminers-localization-utils.mjs';

const dataset = JSON.parse(await readFile('public/data/rocket-dialogues.json', 'utf8'));
const entry = (name) => dataset.entries.find((candidate) => candidate.trainerName === name);

describe('generated Japanese Rocket dialogues', () => {
  it('全ラインナップを日本語化し、画面用dialoguesへ英語文を残さない', () => {
    expect(dataset.schemaVersion).toBe(2);
    expect(dataset.entries).toHaveLength(26);
    expect(dataset.entries.every((candidate) => candidate.dialogues.length > 0)).toBe(true);
    expect(dataset.entries.flatMap((candidate) => candidate.dialogues).filter(isLikelyEnglishSentence))
      .toEqual([]);
  });

  it('18タイプとWater男女を区別する', () => {
    const types = [
      'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
      'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark',
      'steel', 'fairy',
    ];
    expect(types.every((type) => dataset.entries.some((candidate) => candidate.type === type)))
      .toBe(true);
    expect(entry('Water-type Male Grunt').dialogues).not.toEqual(
      entry('Water-type Female Grunt').dialogues,
    );
  });

  it('強力男女・おとり・Leader・Giovanniの複数セリフを保持する', () => {
    expect(entry('Male Grunt').dialogues).toHaveLength(3);
    expect(entry('Female Grunt').dialogues).toHaveLength(3);
    expect(entry('Decoy Female Grunt').dialogues).toHaveLength(10);
    expect(entry('Arlo').dialogues.length).toBeGreaterThanOrEqual(5);
    expect(entry('Cliff').dialogues.length).toBeGreaterThanOrEqual(5);
    expect(entry('Sierra').dialogues.length).toBeGreaterThanOrEqual(5);
    expect(entry('Giovanni').dialogues.length).toBeGreaterThanOrEqual(5);
    expect(entry('Giovanni').identity).toBe('team go rocket boss::giovanni::');
  });
});
