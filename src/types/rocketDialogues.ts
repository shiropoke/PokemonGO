export interface RocketDialogueEntry {
  identity: string;
  trainerName: string;
  title: string;
  type: string | null;
  dialogues: string[];
}

export interface RocketDialogueDataset {
  schemaVersion: 2;
  generatedAt: string;
  source: string;
  supplementalSources: string[];
  localizationSources: string[];
  entries: RocketDialogueEntry[];
}
