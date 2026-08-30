import { HOME_SECTION_ORDER_STORAGE_KEY } from './appStorage';

export const HOME_SECTION_IDS = [
  'featured',
  'limited-today',
  'ongoing',
  'weekly',
  'raids',
  'favorites',
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];
export type HomeSectionOrder = readonly HomeSectionId[];

export interface HomeSectionOrderStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const knownSections = new Set<string>(HOME_SECTION_IDS);

export function isHomeSectionOrder(value: unknown): value is HomeSectionOrder {
  return Array.isArray(value)
    && value.length === HOME_SECTION_IDS.length
    && new Set(value).size === HOME_SECTION_IDS.length
    && value.every((id) => typeof id === 'string' && knownSections.has(id));
}

export function resolveInitialHomeSectionOrder(
  storage?: HomeSectionOrderStorage | null,
): HomeSectionOrder {
  if (!storage) return HOME_SECTION_IDS;
  try {
    const raw = storage.getItem(HOME_SECTION_ORDER_STORAGE_KEY);
    if (!raw) return HOME_SECTION_IDS;
    const parsed: unknown = JSON.parse(raw);
    return isHomeSectionOrder(parsed) ? parsed : HOME_SECTION_IDS;
  } catch {
    return HOME_SECTION_IDS;
  }
}

export function saveHomeSectionOrder(
  order: HomeSectionOrder,
  storage?: HomeSectionOrderStorage | null,
): void {
  if (!storage || !isHomeSectionOrder(order)) return;
  try {
    storage.setItem(HOME_SECTION_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Storage restrictions must not prevent the in-memory preference from changing.
  }
}

export function moveHomeSection(
  order: HomeSectionOrder,
  source: HomeSectionId,
  target: HomeSectionId,
): HomeSectionOrder {
  const sourceIndex = order.indexOf(source);
  const targetIndex = order.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return order;
  const next = [...order];
  next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, source);
  return next as HomeSectionOrder;
}
