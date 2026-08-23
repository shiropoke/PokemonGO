import bugIcon from '../assets/types/bug.png';
import darkIcon from '../assets/types/dark.png';
import dragonIcon from '../assets/types/dragon.png';
import electricIcon from '../assets/types/electric.png';
import fairyIcon from '../assets/types/fairy.png';
import fightingIcon from '../assets/types/fighting.png';
import fireIcon from '../assets/types/fire.png';
import flyingIcon from '../assets/types/flying.png';
import ghostIcon from '../assets/types/ghost.png';
import grassIcon from '../assets/types/grass.png';
import groundIcon from '../assets/types/ground.png';
import iceIcon from '../assets/types/ice.png';
import normalIcon from '../assets/types/normal.png';
import poisonIcon from '../assets/types/poison.png';
import psychicIcon from '../assets/types/psychic.png';
import rockIcon from '../assets/types/rock.png';
import steelIcon from '../assets/types/steel.png';
import waterIcon from '../assets/types/water.png';
import { POKEMON_TYPES } from '../types/gameData';
import type { PokemonType } from '../types/gameData';

export interface TypeMeta {
  key: PokemonType;
  labelJa: string;
  icon: string;
  /** 添付アイコンの円から取得した代表色。 */
  representativeColor: string;
  /** 明るい背景で4.5:1以上のコントラストになる同系色。 */
  textColor: string;
  /** 暗い背景で4.5:1以上のコントラストになる同系色。 */
  textColorDark: string;
  /** CSSのrgba()で背景・枠へ使う代表色のRGB値。 */
  rgb: string;
}

export interface ResolvedTypeMeta {
  key: string;
  labelJa: string;
  icon: string | null;
  representativeColor: string;
  textColor: string;
  textColorDark: string;
  rgb: string;
}

export const TYPE_META: Readonly<Record<PokemonType, TypeMeta>> = {
  normal: {
    key: 'normal', labelJa: 'ノーマル', icon: normalIcon,
    representativeColor: '#8E9398', textColor: '#646A6E', textColorDark: '#AEB4B9', rgb: '142, 147, 152',
  },
  fighting: {
    key: 'fighting', labelJa: 'かくとう', icon: fightingIcon,
    representativeColor: '#E32446', textColor: '#C12941', textColorDark: '#EF667A', rgb: '227, 36, 70',
  },
  flying: {
    key: 'flying', labelJa: 'ひこう', icon: flyingIcon,
    representativeColor: '#82ABF7', textColor: '#3D6AC4', textColorDark: '#9BBBF9', rgb: '130, 171, 247',
  },
  poison: {
    key: 'poison', labelJa: 'どく', icon: poisonIcon,
    representativeColor: '#B53FE8', textColor: '#942DBE', textColorDark: '#CC75F1', rgb: '181, 63, 232',
  },
  ground: {
    key: 'ground', labelJa: 'じめん', icon: groundIcon,
    representativeColor: '#DD7438', textColor: '#A34C18', textColorDark: '#E38B5A', rgb: '221, 116, 56',
  },
  rock: {
    key: 'rock', labelJa: 'いわ', icon: rockIcon,
    representativeColor: '#CBB671', textColor: '#786327', textColorDark: '#D9C98E', rgb: '203, 182, 113',
  },
  bug: {
    key: 'bug', labelJa: 'むし', icon: bugIcon,
    representativeColor: '#8DC919', textColor: '#567D0A', textColorDark: '#A8D451', rgb: '141, 201, 25',
  },
  ghost: {
    key: 'ghost', labelJa: 'ゴースト', icon: ghostIcon,
    representativeColor: '#5C5DF5', textColor: '#4848C4', textColorDark: '#8989FF', rgb: '92, 93, 245',
  },
  steel: {
    key: 'steel', labelJa: 'はがね', icon: steelIcon,
    representativeColor: '#25A0C0', textColor: '#14758C', textColorDark: '#5CB6CC', rgb: '37, 160, 192',
  },
  fire: {
    key: 'fire', labelJa: 'ほのお', icon: fireIcon,
    representativeColor: '#FD8E2D', textColor: '#A94B00', textColorDark: '#FD9B4B', rgb: '253, 142, 45',
  },
  water: {
    key: 'water', labelJa: 'みず', icon: waterIcon,
    representativeColor: '#43ABF7', textColor: '#0D70B4', textColorDark: '#5DB8FA', rgb: '67, 171, 247',
  },
  grass: {
    key: 'grass', labelJa: 'くさ', icon: grassIcon,
    representativeColor: '#4ECE5D', textColor: '#247E30', textColorDark: '#69D875', rgb: '78, 206, 93',
  },
  electric: {
    key: 'electric', labelJa: 'でんき', icon: electricIcon,
    representativeColor: '#FDDC1C', textColor: '#806A00', textColorDark: '#FDE45A', rgb: '253, 220, 28',
  },
  psychic: {
    key: 'psychic', labelJa: 'エスパー', icon: psychicIcon,
    representativeColor: '#FC636F', textColor: '#C93443', textColorDark: '#FF7E88', rgb: '252, 99, 111',
  },
  ice: {
    key: 'ice', labelJa: 'こおり', icon: iceIcon,
    representativeColor: '#61DAD3', textColor: '#0D7774', textColorDark: '#75E2DC', rgb: '97, 218, 211',
  },
  dragon: {
    key: 'dragon', labelJa: 'ドラゴン', icon: dragonIcon,
    representativeColor: '#057FEE', textColor: '#0068C5', textColorDark: '#4BA5F8', rgb: '5, 127, 238',
  },
  dark: {
    key: 'dark', labelJa: 'あく', icon: darkIcon,
    representativeColor: '#666884', textColor: '#5D6078', textColorDark: '#9A9DB7', rgb: '102, 104, 132',
  },
  fairy: {
    key: 'fairy', labelJa: 'フェアリー', icon: fairyIcon,
    representativeColor: '#F47AE7', textColor: '#BD25AF', textColorDark: '#F69AED', rgb: '244, 122, 231',
  },
};

export const TYPE_LABELS_JA = Object.fromEntries(
  POKEMON_TYPES.map((type) => [type, TYPE_META[type].labelJa]),
) as Record<PokemonType, string>;

const UNKNOWN_TYPE_COLORS = {
  representativeColor: '#7D8792',
  textColor: '#5E6872',
  textColorDark: '#AEB7C0',
  rgb: '125, 135, 146',
} as const;

export function normalizeTypeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function isPokemonType(value: string): value is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(value);
}

/** 外部データの未知タイプでも画面全体を壊さない表示用resolver。 */
export function getTypeMeta(type: string): ResolvedTypeMeta {
  const key = normalizeTypeKey(type);
  if (isPokemonType(key)) return TYPE_META[key];
  return {
    key: key || 'unknown',
    labelJa: type.trim() || '不明',
    icon: null,
    ...UNKNOWN_TYPE_COLORS,
  };
}

export function getTypeLabelJa(type: string): string {
  return getTypeMeta(type).labelJa;
}
