export type PokefutaRegion =
  | '北海道・東北'
  | '関東'
  | '中部'
  | '近畿'
  | '中国・四国'
  | '九州・沖縄';

export interface PokefutaPrefecture {
  code: number;
  name: string;
  slug: string;
  region: PokefutaRegion;
  order: number;
  count: number;
  installed: boolean;
}

export interface Pokefuta {
  id: string;
  prefecture: string;
  prefectureCode: number;
  prefectureSlug: string;
  region: PokefutaRegion;
  municipality: string;
  locationName: string;
  pokemonNames: string[];
  address: string;
  imageUrl: string | null;
  officialUrl: string;
  mapUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PokefutaDataset {
  schemaVersion: 1;
  generatedAt: string;
  source: string;
  summary: {
    total: number;
    installedPrefectures: number;
    uninstalledPrefectures: number;
  };
  prefectures: PokefutaPrefecture[];
  lids: Pokefuta[];
}

