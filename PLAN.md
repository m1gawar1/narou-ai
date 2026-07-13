# 修正・改善計画（コードレビュー結果）

作成日: 2026-07-06

## 修正点（バグ）

### 1. タグクリック検索が「1つ前の状態」で実行される（stale closure）⭐優先
- 対象: `src/app/page.tsx:475, 511, 1173`
- `setKeyword(tag); setTimeout(() => doSearch(1), 0)` パターンは、setTimeout がその時点の render の `doSearch` を掴むため、更新前のキーワードで検索が走る（初回クリックで空検索になる）
- 該当箇所: 類似作品検索・タグクラウド・ウェルカム画面のタグ
- 対策: `doSearch` に検索条件を引数で渡す、または `useEffect` で状態変化を監視して検索する

### 2. タグクラウドの OR 検索が未実装
- 対象: `src/app/page.tsx:508-512`
- UI に AND/OR トグルがあるが `handleTagSearch` は `mode` 引数を無視してスペース結合（なろうAPIでは常にAND）
- 対策: タグごとに検索して結果をマージするか、OR トグル自体を削除

### 3. 共有URLの復元が不完全
- 対象: `src/app/page.tsx:277-293`
- `handleShareSearch` は全条件（order, minlen, notword, lastup…）をURLに含めるが、復元側は `word` と `genre` しか読まない
- 対策: 復元処理で全パラメータを読み込む

### 4. お気に入りページで削除しても表示が消えない ⭐優先
- 対象: `src/app/favorites/page.tsx:33`
- `handleRemove` が定義されているのに未使用。カード内のハートで解除しても localStorage が変わるだけでリストが再描画されない
- 対策: `NovelCard` にお気に入り変更のコールバック prop を追加して親の state を更新

### 5. 更新チェック結果に「0」が紛れ込む
- 対象: `src/app/favorites/page.tsx:240`
- `{u.newEpisodes && u.newEpisodes > 0 && (...)}` は `newEpisodes` が 0 のとき JSX が数値 `0` を描画する
- 対策: `{u.newEpisodes && ...}` を `{u.newEpisodes > 0 && ...}` に変更

### 6. APIエラーがユーザーに伝わらない ⭐優先
- 対象: `src/lib/narou.ts:221-224`
- `fetchNarouNovels` が catch で `{allcount: 0, novels: []}` を返すため、なろうAPI障害時も「検索結果が見つかりませんでした」と表示される。route.ts の try/catch は実質デッドコード
- 対策: エラーは throw して API ルートで 500 を返し、UI 側でエラー表示する

### 7. `themeColor` の export 位置が非推奨
- 対象: `src/app/layout.tsx:24`
- Next.js 14 以降、`themeColor` は `viewport` export に入れる仕様（現状ビルド時に警告）
- 対策: `export const viewport` 内に移動

### 8. ランキングの複数ジャンル選択時の問題
- 対象: `src/app/ranking/page.tsx:61-104, 107-123`
- 複数ジャンル時は常に1ページ目にリセットされページ移動不可。合計40件程度しか取得しないのに「全 X 作品」と表示され件数が不正確
- 初回マウント時に 2つの useEffect（109行目・121行目）が両方発火して二重フェッチ

## 改善点

- **未使用依存の削除**: `recharts`・`clsx`・`tailwind-merge` はどこからも import されていない
- **フォントを `next/font` に移行**: `<head>` 直書きの `<link>` を `next/font/google` の `Noto_Sans_JP` に。各所の `style={{ fontFamily: ... }}` の重複指定も不要になる
- **なろうAPIレスポンスのキャッシュ**: サーバー側 fetch に `next: { revalidate: 300 }` 等を付与。`gzip=5` の利用も検討（なろうAPIは負荷軽減を利用者に要請）
- **インラインstyleとTailwindの混在解消**: `page.tsx` のガチャ・検索バー周りの巨大なインラインstyleを Tailwind クラスか globals.css に寄せる
- **モバイルUX**:
  - タグクラウドの複数選択が「右クリック」なのでスマホで使えない（長押し or 常時トグル式に）
  - ジャンルチップ等のタッチターゲットが44px未満の箇所が多い（WCAG基準）
- **`(params as any).ncode` の型ハック解消**: `SearchParams` に `ncode?: string` を追加（`src/lib/narou.ts:197`, `src/app/api/search/route.ts:13`）
- **README がテンプレートのまま**: アプリ概要・起動方法・使用APIを記載する

## 追加機能の提案

1. **AI推薦機能**（本命）: プロジェクト名が「なろう小説おすすめAI」なのにAI要素がない。Claude API で「今の気分」自由文→検索条件変換、お気に入り履歴のあらすじ・タグから好み分析してパーソナライズ推薦
2. **閲覧履歴（最近見た作品）**: 「作品を読む」クリック履歴を localStorage に保存。低コスト・高効果
3. **お気に入りの整理機能**: 「読了/積読」ステータス、フォルダ/タグ分け、追加日・更新日ソート、更新チェック後の「既読にする」
4. **作品詳細ページ（`/novel/[ncode]`）**: 共有・SEO・PWAショートカットが効くようになる
5. **ランキング推移グラフ**: 日間/週間/月間ポイントは取得済みなので棒グラフで「勢い」を可視化（recharts を残すならここで活用）
6. **無限スクロール**: ページネーションと併用でモバイルの回遊性向上

## 着手順の推奨

影響の大きい **1（stale closure）→ 4（お気に入り削除）→ 6（エラー表示）** から着手。
