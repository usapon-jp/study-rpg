# tama-study-rpg

たま向けの勉強RPGプロトタイプです。学習クエスト、報酬、マイルーム、町づくりを1つの軽いブラウザ体験としてまとめ、将来の2.5D表示やUnity移植に備えてデータを分離しています。

## 設計方針

### マイルーム

- 壁紙、床、家具は `src/data/roomItems.js` の静的定義と、プレイヤー状態内の `room` を分けて扱います。
- 配置済み家具は `room.furniture` に `desk`、`shelf`、`rug`、`window`、`smallItem` のスロット別IDとして保存します。
- 既存保存データとの互換のため `room.placed` も読み込みますが、新しいマイルーム画面ではスロット制の `room.furniture` を優先します。
- 画面表現は現在のReact実装に閉じますが、壁紙・床・家具IDは将来の2.5DマップやUnityシーンでも読み替えやすい形を保ちます。

### まちづくり

- 町は `town.level`、`town.growth`、`town.theme`、`town.discoveredSpirits` を中心に進行します。
- 配置できる町オブジェクトは `src/data/townObjects.js` に分離し、保存側は `town.objects[]` の `itemId` と `spotId` だけを持ちます。
- 家具やクエスト報酬がテーマ値を育て、ホーム背景、町の見た目、精霊の解放に反映される想定です。
- 町のビジュアルはスポット制配置から始め、将来はテーマ混合や2.5Dの奥行き表示へ拡張します。

### スポット制

- マイルームや町の編集は、自由座標ではなくスポットまたはセル単位を基本にします。
- 初期実装ではマイルームはスロット、町は `spotId` で配置位置を表し、ドラッグ配置や回転はこのデータを拡張するUIとして追加します。
- スポット制にすることで、スマホ操作、保存データ、2.5D化、Unity移植のいずれでも扱いやすい状態を維持します。

### データ分離

- マスターデータは `src/gameData.js` と `src/data/` に置き、進行状態は `createInitialState()` と保存レイヤーで分離します。
- `src/data/roomItems.js` はマイルーム用、`src/data/townObjects.js` は町づくり用の配置アイテム定義です。
- 画像パスは `asset()` を通して `import.meta.env.BASE_URL` を使うため、GitHub Pages のサブパス配信でも参照が壊れにくい構成です。
- 今後、家具、町、クエスト、素材などの定義はJSON化して、React UIとUnityの双方から読める形へ寄せます。

### 将来の2.5D / Unity移植

- React版では、まずスポット制のデータ構造とUI体験を固めます。
- 2.5D化では、セル番号をアイソメトリック座標や奥行きレイヤーへ変換する表示層を追加します。
- Unity移植では、`room.furniture`、`town.objects`、インベントリ、マスターデータをJSONとして書き出し、Prefab ID、座標、回転、テーマ値に変換する方針です。

## 開発コマンド

```bash
npm install
npm run dev
npm run build
npm run preview
```

- `npm run dev`: Vite開発サーバーを `127.0.0.1` で起動します。
- `npm run build`: 本番用の静的ファイルを `dist/` に生成します。
- `npm run preview`: ビルド結果をローカルで確認します。

## GitHub Pages の base 設定

`vite.config.js` では `base: "/study-rpg/"` を設定しています。GitHub Pages の公開先が `https://<user>.github.io/study-rpg/` のようなリポジトリページである前提です。

リポジトリ名や公開パスを変える場合は、`vite.config.js` の `base` も同じパスに更新してください。ローカル開発時のアセット参照も `import.meta.env.BASE_URL` 経由に寄せることで、Pages配信時の画像リンク切れを避けます。
