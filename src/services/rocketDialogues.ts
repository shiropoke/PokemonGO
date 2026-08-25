import type { DatasetLoadOptions } from '../types/scrapedDuck';
import type { RocketDialogueEntry } from '../types/rocketDialogues';
import { normalizeRocketDialogueDataset } from '../utils/rocketDialogues';

export const ROCKET_DIALOGUES_URL = `${import.meta.env.BASE_URL}data/rocket-dialogues.json`;

export async function loadRocketDialogueEntries(
  options: DatasetLoadOptions = {},
): Promise<RocketDialogueEntry[]> {
  const response = await fetch(ROCKET_DIALOGUES_URL, {
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });
  if (!response.ok) throw new Error('GOロケット団のセリフを取得できませんでした');
  const dataset = normalizeRocketDialogueDataset(await response.json());
  if (!dataset) throw new Error('GOロケット団のセリフデータが不正です');
  return dataset.entries;
}
