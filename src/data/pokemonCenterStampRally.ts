import { matchesSearchQuery } from '../utils/search';

export type PokemonCenterStampRallyRegion =
  | '北海道・東北'
  | '関東'
  | '中部・北陸'
  | '関西'
  | '中国・四国'
  | '九州・沖縄';

export interface PokemonCenterStampRallyLocation {
  id: string;
  name: string;
  shortName: string;
  region: PokemonCenterStampRallyRegion;
  prefecture: string;
  city: string;
  address: string;
  officialUrl: string;
  googleMapsUrl: string;
  latitude: null;
  longitude: null;
  isGoLab: boolean;
}

const shopUrl = (slug: string) => `https://shop.pokemon.co.jp/ja/shop/${slug}/`;
const googleMapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

function location(
  id: string,
  name: string,
  shortName: string,
  region: PokemonCenterStampRallyRegion,
  prefecture: string,
  city: string,
  address: string,
  officialUrl: string,
  isGoLab = false,
): PokemonCenterStampRallyLocation {
  return { id, name, shortName, region, prefecture, city, address, officialUrl, googleMapsUrl: googleMapsUrl(address), latitude: null, longitude: null, isGoLab };
}

export const POKEMON_CENTER_STAMP_RALLY_LOCATIONS: readonly PokemonCenterStampRallyLocation[] = [
  location('sapporo', 'ポケモンセンターサッポロ', 'サッポロ', '北海道・東北', '北海道', '札幌市中央区', '北海道札幌市中央区北5条西4-7 大丸札幌店 8F', shopUrl('pokemoncenter-sapporo')),
  location('tohoku', 'ポケモンセンタートウホク', 'トウホク', '北海道・東北', '宮城県', '仙台市青葉区', '宮城県仙台市青葉区中央1-2-3 仙台PARCO1 3F', shopUrl('pokemoncenter-tohoku')),
  location('tokyodx', 'ポケモンセンタートウキョーDX', 'トウキョーDX', '関東', '東京都', '中央区', '東京都中央区日本橋2-11-2 日本橋髙島屋S.C.東館 5F', shopUrl('pokemoncenter-tokyodx')),
  location('megatokyo', 'ポケモンセンターメガトウキョー', 'メガトウキョー', '関東', '東京都', '豊島区', '東京都豊島区東池袋3-1-2 サンシャインシティ 専門店街アルパ 2F', shopUrl('pokemoncenter-megatokyo')),
  location('shibuya', 'ポケモンセンターシブヤ', 'シブヤ', '関東', '東京都', '渋谷区', '東京都渋谷区宇田川町15-1 渋谷PARCO 6F', shopUrl('pokemoncenter-shibuya')),
  location('skytreetown', 'ポケモンセンタースカイツリータウン', 'スカイツリータウン', '関東', '東京都', '墨田区', '東京都墨田区押上1-1-2 東京スカイツリータウン・ソラマチ イーストヤード 4F', shopUrl('pokemoncenter-skytreetown')),
  location('tokyobay', 'ポケモンセンタートウキョーベイ', 'トウキョーベイ', '関東', '千葉県', '船橋市', '千葉県船橋市浜町2-1-1 三井ショッピングパーク ららぽーとTOKYO-BAY 西館 2F', shopUrl('pokemoncenter-tokyobay')),
  location('yokohama', 'ポケモンセンターヨコハマ', 'ヨコハマ', '関東', '神奈川県', '横浜市西区', '神奈川県横浜市西区高島2-19-12 横浜スカイビル 8F', shopUrl('pokemoncenter-yokohama')),
  location('go-lab', 'Pokémon GO Lab.', 'GO Lab', '関東', '東京都', '豊島区', '東京都豊島区東池袋3-1-2 サンシャインシティ 専門店街アルパ 2F', 'https://shop.pokemon.co.jp/ja/shop/common/events/202606/000336.html', true),
  location('nagoya', 'ポケモンセンターナゴヤ', 'ナゴヤ', '中部・北陸', '愛知県', '名古屋市中区', '愛知県名古屋市中区栄3-29-1 名古屋PARCO 東館 2F', shopUrl('pokemoncenter-nagoya')),
  location('kanazawa', 'ポケモンセンターカナザワ', 'カナザワ', '中部・北陸', '石川県', '金沢市', '石川県金沢市堀川新町3-1 金沢フォーラス 5F', shopUrl('pokemoncenter-kanazawa')),
  location('kyoto', 'ポケモンセンターキョウト', 'キョウト', '関西', '京都府', '京都市下京区', '京都府京都市下京区四条通室町東入函谷鉾町78 京都経済センター SUINA室町 2F', shopUrl('pokemoncenter-kyoto')),
  location('osakadx', 'ポケモンセンターオーサカDX', 'オーサカDX', '関西', '大阪府', '大阪市中央区', '大阪府大阪市中央区心斎橋筋1-7-1 大丸心斎橋店 本館 9F', shopUrl('pokemoncenter-osakadx')),
  location('osaka', 'ポケモンセンターオーサカ', 'オーサカ', '関西', '大阪府', '大阪市北区', '大阪府大阪市北区梅田3-1-1 ルクア サウス 13F', shopUrl('pokemoncenter-osaka')),
  location('hiroshima', 'ポケモンセンターヒロシマ', 'ヒロシマ', '中国・四国', '広島県', '広島市南区', '広島県広島市南区松原町1-2 ekie 2F', shopUrl('pokemoncenter-hiroshima')),
  location('kagawa', 'ポケモンセンターカガワ', 'カガワ', '中国・四国', '香川県', '高松市', '香川県高松市丸亀町8-23 丸亀町グリーン 東館 1F', shopUrl('pokemoncenter-kagawa')),
  location('fukuoka', 'ポケモンセンターフクオカ', 'フクオカ', '九州・沖縄', '福岡県', '福岡市博多区', '福岡県福岡市博多区博多駅中央街9-1 博多マルイ 2F', shopUrl('pokemoncenter-fukuoka')),
  location('okinawa', 'ポケモンセンターオキナワ', 'オキナワ', '九州・沖縄', '沖縄県', '中頭郡北中城村', '沖縄県中頭郡北中城村字ライカム1 イオンモール沖縄ライカム 1F', shopUrl('pokemoncenter-okinawa')),
] as const;

export function filterPokemonCenterStampRallyLocations(
  locations: readonly PokemonCenterStampRallyLocation[],
  query: string,
  region: PokemonCenterStampRallyRegion | 'all',
): PokemonCenterStampRallyLocation[] {
  return locations.filter((item) => (
    (region === 'all' || item.region === region)
    && matchesSearchQuery(query, [item.name, item.shortName, item.prefecture, item.city, item.address])
  ));
}

export function getPokemonCenterStampRallyStatus(now = new Date()): '開催前' | '開催中' | '終了' {
  const start = new Date(2026, 6, 1);
  const end = new Date(2027, 7, 31, 23, 59, 59, 999);
  if (now < start) return '開催前';
  return now > end ? '終了' : '開催中';
}
