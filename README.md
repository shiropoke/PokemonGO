# Pokémon GO Information

Pokémon GO の「今日やること」、イベント、レイド、各種データと計算ツールをまとめて確認できる、スマートフォン向けの静的 Web アプリです。バックエンド、データベース、API キー、有料サービスは使用しません。

GitHub Pages の公開 URL は次の形式です。

```text
https://<GitHubユーザー名>.github.io/PokemonGO/
```

## 主な機能

### イベント

- 開催中、今後、終了済み、日時未定への自動分類
- 開催中は終了が近い順、今後は開始が近い順に表示
- 1 分単位で更新される開始・終了カウントダウン
- イベント種類フィルター
- 5 分間の `localStorage` キャッシュ
- 通信失敗時の保存済みデータへのフォールバック
- UTC の絶対時刻と、タイムゾーン指定なしの現地時間を区別
- 画像の遅延読み込みと読み込み失敗時プレースホルダー
- Leek Duck イベント詳細への外部リンク
- ポケモン名と定型イベント表現を使った日本語タイトル表示
- ScrapedDuck の `eventType` ごとの日本語種別表示

### 個体値チェッカー

- 日本語名・英語名・図鑑番号・`speciesId` で検索できるポケモン選択
- PokeAPI の日本語名を優先し、フォルム違い、シャドウを `speciesId` 単位で個別に表示
- PL40 / PL50 と、相棒ブースト PL41 / PL51
- 0〜15 の攻撃・防御・HP 個体値入力
- IV 合計、個体値%、星評価のリアルタイム計算
- 任意 CP から一致する現在 PL 候補を探索
- リーグ選択なしで、スーパー・ハイパー・マスターの結果を同時表示
- 全 3 リーグで 0〜15 の全 4096 通りを比較する順位計算
- マスターリーグは全個体を同じ最大 PL（PL40 / 41 / 50 / 51）で比較
- ポケモン・リーグ・PL 上限ごとのランキングをメモリキャッシュ
- 最後に選択した条件を `localStorage` へ保存

### 今日の情報とデータ一覧

- 開催中、今日開始・終了、時間限定イベントをまとめるホームダッシュボード
- 現在のレイドボスを区分別に表示し、PL40 / 50、メガ・シャドウ条件付きの攻撃性能参考順位を表示
- フィールドリサーチ、タマゴ、GOロケット団ラインナップの日本語表示・検索・フィルター
- 通信失敗時は各ScrapedDuckデータの保存済みキャッシュへフォールバック

### 計算・データツール

- 同じPL・IVを使う進化後CPとPL40 / 50 / 51比較
- Game Master由来の強化コスト（ほしのすな、アメ、アメXL）とキラ・シャドウ・ライト補正
- PvE / PvPの通常技・ゲージ技性能と、Game Masterで確認できるエリート技表示
- PvPoke Overallデータによるスーパー・ハイパー・マスターのPokémon種ランキング
- ランキングから既存個体値チェッカーへ`speciesId`を引き継ぎ

### お気に入りと表示設定

- Pokémonのお気に入りを`pokemon-go:favorites`へ保存し、レイド・イベント・タマゴ・リサーチを横断表示
- ライト / ダークテーマを`pokemon-go:theme`へ保存
- 未設定時は`prefers-color-scheme`へ追従
- PCは分類メニュー、スマートフォンは「ホーム / イベント / レイド / ツール / その他」の5項目ナビゲーション

## 使用技術

- Vite
- React
- TypeScript
- Vitest
- GitHub Actions / GitHub Pages

ルーティングは URL ハッシュを使用するため、GitHub Pages で各画面を再読み込みしても 404 になりません。Vite の `base` は `/PokemonGO/` に設定済みです。

## ローカル実行

Node.js 20 以上を使用してください。

```bash
npm install
npm run dev
```

Vite が表示する `http://localhost:5173/PokemonGO/` をブラウザで開きます。

## テストとビルド

```bash
npm test
npm run build
```

本番成果物は `dist/` に生成されます。ローカルで本番成果物を確認する場合は次を実行します。

```bash
npm run preview
```

計算テストでは、次を確認しています。

- 15 / 15 / 15 が 100%、0 / 0 / 0 が 0%
- CP の最低値が 10
- 計算結果が選択した PL 上限を超えない
- スーパーリーグで CP1500、ハイパーリーグで CP2500 を超えない
- 0〜15 の 4096 通りすべてが順位対象
- マスターリーグで 15 / 15 / 15 が 1 位になり、全個体が同じ最大 PL で比較される
- 相棒ブーストなし / ありで PL40 / 41、PL50 / 51 になる
- Venusaur の既知例 0 / 14 / 11、PL21、CP1498 がスーパーリーグ 1 位になる

## GitHub Pages への公開

`.github/workflows/deploy.yml` が、`main` または `master` ブランチへの push 時に次を実行します。

1. `npm ci`
2. `npm run data:pokemon` で軽量Pokémonデータを更新
3. `npm run data:game` と `npm run data:pvp` で静的データを更新（取得失敗時はコミット済みデータを維持）
4. `npm run build`
5. `dist/` を GitHub Pages へデプロイ

初回のみ、GitHub リポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択してください。その後 `main` または `master` ブランチへ push するとデプロイされます。既定ブランチ名がそれ以外の場合は、ワークフローの `branches` をその名前へ変更してください。

## データソース

### ScrapedDuck / Leek Duck

- [ScrapedDuck events.json](https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json)
- [ScrapedDuck raids.json](https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json)
- [ScrapedDuck research.json](https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/research.json)
- [ScrapedDuck eggs.json](https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json)
- [ScrapedDuck rocketLineups.json](https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/rocketLineups.json)
- [ScrapedDuck Events documentation](https://github.com/bigfoott/ScrapedDuck/wiki/Events)
- [Leek Duck](https://leekduck.com/)

ScrapedDuckデータはデータセット別にブラウザで最低5分間キャッシュします。5分以内の再表示ではネットワークへ再アクセスせず、再取得に失敗した場合は期限切れのキャッシュも表示に使用します。

Event data provided by [Leek Duck](https://leekduck.com/) / [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck).

このアプリには広告、有料機能、ペイウォールを実装していません。

### ポケモン基礎ステータス

- [PvPoke Game Master](https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json)
- [PvPoke repository](https://github.com/pvpoke/pvpoke)

`npm run data:pokemon` が Game Master から `dex`、`speciesName`、`speciesId`、`baseStats`、`released`、`tags` など計算に必要な項目だけを抽出し、`public/data/pokemon.json` を生成します。GitHub Actions でもデプロイ前に更新し、通信に失敗した場合はコミット済みの軽量データを維持してビルドを続行します。ブラウザは生成済みの軽量 JSON だけを読み込み、7 日間キャッシュします。期限切れ後の読み込みに失敗した場合は保存済みデータを使用します。

### PokeMiners Game Master

- [PokeMiners game_masters](https://github.com/PokeMiners/game_masters)
- [PokeMiners pogo_assets](https://github.com/PokeMiners/pogo_assets)

`npm run data:game` が最新Game Masterと日本語テキストから、タイプ、進化先、技性能、強化コスト、タイプ相性だけを`public/data/game-data.json`へ抽出します。ブラウザは約500KBの静的ファイルだけを読み込み、巨大なGame Masterを直接取得しません。

### PvPoke Pokémonランキング

- [PvPoke open league rankings](https://github.com/pvpoke/pvpoke/tree/master/src/data/rankings/all/overall)

`npm run data:pvp` がCP1500 / 2500 / 10000のOverallランキングから表示項目だけを`public/data/pvp-rankings.json`へ保存します。PvPokeのMITライセンス表記は[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)に記載しています。

### ポケモン日本語名

- [PokeAPI `pokemon_species_names.csv`](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_species_names.csv)
- [PokeAPI `pokemon_form_names.csv`](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_form_names.csv)
- [PokeAPI `pokemon.csv`](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon.csv)
- [PokeAPI `pokemon_forms.csv`](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_forms.csv)

同じ生成処理で PokeAPI の日本語種族名・フォルム名を静的データへ変換します。選択画面を開くたびに PokeAPI へアクセスすることはありません。日本語名はポケモン選択とイベントタイトルの両方で共有し、対応する日本語名がない項目だけ英語へフォールバックします。PokeAPI は [BSD 3-Clause License](https://github.com/PokeAPI/pokeapi/blob/master/LICENSE.md) で公開されています。ライセンス全文は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。

ローカルのポケモンデータを明示的に更新する場合は次を実行します。

```bash
npm run data:pokemon
npm run data:game
npm run data:pvp
```

CP・PvP 順位のコードは Pokémon GO の公開されている計算式と CPM テーブルに基づく独自実装で、PvPoke のソースコードをコピーしていません。照合用に PvPoke の既知結果をテストしています。PvPoke は [MIT License](https://github.com/pvpoke/pvpoke/blob/master/LICENSE) で公開されています。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。

## 主な構成

```text
src/
  components/      カード、検索、入力、ナビゲーション、テーマ、お気に入り
  contexts/        お気に入りの共有状態
  hooks/           外部データとツールデータの共通読込
  data/            PL1〜51のCP Multiplier、日本語名の静的辞書
  pages/           ホーム、イベント、レイド、データ一覧、各計算ツール
  services/        外部データ取得、キャッシュ、テーマ・お気に入り保存
  styles/          機能別レスポンシブスタイル
  types/           外部データと計算の型
  utils/           日時、CP、IV、PvP、進化、強化、タイプ、レイド計算
public/data/        ビルド時生成済みの軽量JSON
scripts/            軽量データ生成スクリプト
.github/workflows/ GitHub Pages デプロイ
```

## 注意点

- ポケモン名は PokeAPI に日本語種族名・フォルム名がない場合、イベント固有名は確認済みの定型表現で日本語化できない場合に英語で表示します。
- イベント内容・基礎ステータス・リリース状態は各外部データソースの更新に依存します。
- 現行ScrapedDuckレイドデータには出現期間、ロケット団データにはしたっぱのセリフが含まれません。リサーチ報酬は現在分類可能なPokémon報酬だけを表示します。
- レイド対策は攻撃種族値、技サイクル、STAB、タイプ相性、シャドウ補正による参考順位です。ボス技、回避、天候、フレンド・メガブースト、耐久による退場時間は含みません。
- Game Masterと既存Pokémon基礎データを一意に対応できないフォームは、推測で統合せずツール対象外として扱います。
- PvP 順位は各 IV の 0〜15 全組み合わせを比較します。スーパー・ハイパーは同じ CP 上限と最大 PL 条件、マスターは同じ最大 PL 条件を使用し、捕獲方法ごとの IV 下限は順位母集団に適用しません。
- Pokémon および Pokémon GO は The Pokémon Company、Nintendo、Creatures、GAME FREAK、Niantic の商標です。本プロジェクトは各社の公式サービスではありません。
