import type { RocketDialogueDataset, RocketDialogueEntry } from '../types/rocketDialogues';
import type { RocketLineup } from '../types/scrapedDuck';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' ? normalizeWhitespace(value) || null : null;
}

function optionalType(value: unknown): string | null {
  return typeof value === 'string' ? normalizeWhitespace(value).toLowerCase() || null : null;
}

function normalizeIdentityPart(value: string | null): string {
  return normalizeWhitespace(value ?? '').normalize('NFKC').toLocaleLowerCase('en-US');
}

export function createRocketDialogueIdentity(
  lineup: Pick<RocketLineup, 'name' | 'title' | 'type'> | {
    trainerName: string;
    title: string;
    type: string | null;
  },
): string {
  const trainerName = 'trainerName' in lineup ? lineup.trainerName : lineup.name;
  return [lineup.title, trainerName, lineup.type]
    .map(normalizeIdentityPart)
    .join('::');
}

function readDialogues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.flatMap((dialogue) => {
    const normalized = requiredString(dialogue);
    return normalized ? [normalized] : [];
  }))];
}

function normalizeEntry(value: unknown): RocketDialogueEntry | null {
  if (!isRecord(value)) return null;
  const trainerName = requiredString(value.trainerName);
  const title = requiredString(value.title);
  const type = optionalType(value.type);
  const dialogues = readDialogues(value.dialogues);
  if (!trainerName || !title || dialogues.length === 0) return null;
  return {
    identity: createRocketDialogueIdentity({ trainerName, title, type }),
    trainerName,
    title,
    type,
    dialogues,
  };
}

export function normalizeRocketDialogueDataset(value: unknown): RocketDialogueDataset | null {
  if (!isRecord(value) || value.schemaVersion !== 2 || !Array.isArray(value.entries)) {
    return null;
  }
  const generatedAt = requiredString(value.generatedAt);
  const source = requiredString(value.source);
  if (!generatedAt || !source) return null;

  const byIdentity = new Map<string, RocketDialogueEntry>();
  for (const item of value.entries) {
    const entry = normalizeEntry(item);
    if (!entry) continue;
    const previous = byIdentity.get(entry.identity);
    byIdentity.set(entry.identity, previous
      ? { ...previous, dialogues: [...new Set([...previous.dialogues, ...entry.dialogues])] }
      : entry);
  }
  if (value.entries.length > 0 && byIdentity.size === 0) return null;

  const supplementalSources = Array.isArray(value.supplementalSources)
    ? value.supplementalSources.flatMap((entry) => requiredString(entry) ?? [])
    : [];
  const localizationSources = Array.isArray(value.localizationSources)
    ? value.localizationSources.flatMap((entry) => requiredString(entry) ?? [])
    : [];
  if (localizationSources.length === 0) return null;
  return {
    schemaVersion: 2,
    generatedAt,
    source,
    supplementalSources: [...new Set(supplementalSources)],
    localizationSources: [...new Set(localizationSources)],
    entries: [...byIdentity.values()],
  };
}

export function joinRocketDialogues(
  lineups: readonly RocketLineup[],
  entries: readonly RocketDialogueEntry[],
): RocketLineup[] {
  const dialoguesByIdentity = new Map(entries.map((entry) => [entry.identity, entry.dialogues]));
  return lineups.map((lineup) => ({
    ...lineup,
    dialogues: [...(dialoguesByIdentity.get(createRocketDialogueIdentity(lineup)) ?? [])],
  }));
}
