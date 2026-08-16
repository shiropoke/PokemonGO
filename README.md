# Pokémon GO Information

Pokémon GO のイベント情報と、通常個体値・PvP 個体値順位を確認できる、スマートフォン向けの静的 Web アプリです。バックエンド、データベース、API キー、有料サービスは使用しません。

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

### 個体値チェッカー

- 名前・図鑑番号で検索できるポケモン選択
- フォルム違い、シャドウを `speciesId` 単位で個別に表示
- PL40 / PL50 と、相棒ブースト PL41 / PL51
- 0〜15 の攻撃・防御・HP 個体値入力
- IV 合計、個体値%、星評価のリアルタイム計算
- 任意 CP から一致する現在 PL 候補を探索
- スーパーリーグ（CP1500）・ハイパーリーグ（CP2500）の 4096 通り順位計算
- マスターリーグの最大強化時ステータス
- ポケモン・リーグ・PL 上限ごとのランキングをメモリキャッシュ
- 最後に選択した条件を `localStorage` へ保存

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
- 相棒ブーストなし / ありで PL40 / 41、PL50 / 51 になる
- Venusaur の既知例 0 / 14 / 11、PL21、CP1498 がスーパーリーグ 1 位になる

## GitHub Pages への公開

`.github/workflows/deploy.yml` が、`main` または `master` ブランチへの push 時に次を実行します。

1. `npm ci`
2. `npm run data:pokemon` で軽量データを更新
3. `npm run build`
4. `dist/` を GitHub Pages へデプロイ

初回のみ、GitHub リポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択してください。その後 `main` または `master` ブランチへ push するとデプロイされます。既定ブランチ名がそれ以外の場合は、ワークフローの `branches` をその名前へ変更してください。

## データソース

### イベント

- [ScrapedDuck events.json](https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json)
- [ScrapedDuck Events documentation](https://github.com/bigfoott/ScrapedDuck/wiki/Events)
- [Leek Duck](https://leekduck.com/)

イベントデータはブラウザで最低 5 分間キャッシュします。5 分以内の再表示ではネットワークへ再アクセスせず、再取得に失敗した場合は期限切れのキャッシュも表示に使用します。

Event data provided by [Leek Duck](https://leekduck.com/) / [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck).

このアプリには広告、有料機能、ペイウォールを実装していません。

### ポケモン基礎ステータス

- [PvPoke Game Master](https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json)
- [PvPoke repository](https://github.com/pvpoke/pvpoke)

`npm run data:pokemon` が Game Master から `dex`、`speciesName`、`speciesId`、`baseStats`、`released`、`tags` など計算に必要な項目だけを抽出し、`public/data/pokemon.json` を生成します。GitHub Actions でもデプロイ前に更新し、通信に失敗した場合はコミット済みの軽量データを維持してビルドを続行します。ブラウザはこの約 230 KB の軽量 JSON だけを読み込み、7 日間キャッシュします。期限切れ後の読み込みに失敗した場合は保存済みデータを使用します。

ローカルのポケモンデータを明示的に更新する場合は次を実行します。

```bash
npm run data:pokemon
```

CP・PvP 順位のコードは Pokémon GO の公開されている計算式と CPM テーブルに基づく独自実装で、PvPoke のソースコードをコピーしていません。照合用に PvPoke の既知結果をテストしています。PvPoke は [MIT License](https://github.com/pvpoke/pvpoke/blob/master/LICENSE) で公開されています。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。

## 主な構成

```text
src/
  components/      イベントカード、検索、IV入力、結果表示
  data/            PL1〜51 の CP Multiplier
  pages/           イベント、個体値チェッカー
  services/        外部データ取得とキャッシュ
  types/           外部データと計算の型
  utils/           日時、CP、IV、PvP計算とテスト
public/data/        PvPokeから生成した軽量ポケモンデータ
scripts/            軽量ポケモンデータ生成スクリプト
.github/workflows/ GitHub Pages デプロイ
```

## 注意点

- イベント名とポケモン名は、データソースに日本語名がない場合は英語で表示します。
- イベント内容・基礎ステータス・リリース状態は各外部データソースの更新に依存します。
- PvP 順位は各 IV の 0〜15 全組み合わせを、同じリーグ上限と最大 PL 条件で比較します。捕獲方法ごとの IV 下限は順位母集団に適用しません。
- Pokémon および Pokémon GO は The Pokémon Company、Nintendo、Creatures、GAME FREAK、Niantic の商標です。本プロジェクトは各社の公式サービスではありません。
