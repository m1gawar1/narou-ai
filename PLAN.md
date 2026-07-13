# 修正・改善計画（コードレビュー結果）

作成日: 2026-07-06
実施日: 2026-07-13 — **バグ 1〜8 すべて修正済み**。改善点は下記の注記どおり（インラインstyle全面移行とタッチターゲット44px対応のみ意図的に見送り）。ビルド・型チェック・APIスモークテスト通過済み。

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

- ✅ **未使用依存の削除**: `recharts`・`clsx`・`tailwind-merge` を package.json と lockfile から削除済み
- ✅ **フォントを `next/font` に移行**: `next/font/google` の `Noto_Sans_JP`（`--font-noto-sans-jp` 変数）に移行。全コンポーネントの冗長な inline `fontFamily` 指定も削除済み
- ✅ **なろうAPIレスポンスのキャッシュ**: `next: { revalidate: 300 }` を付与済み（`gzip=5` は解凍処理の複雑さに見合わないため見送り）
- ⏸ **インラインstyleとTailwindの混在解消**: fontFamily の掃除のみ実施。全面的な Tailwind 移行は視覚的リグレッションのリスクが高く、機能修正と切り離すべきなので**意図的に見送り**（別タスクで実施推奨）
- **モバイルUX**:
  - ✅ タグクラウドの複数選択: 右クリック廃止、タップで常時トグル方式に変更済み
  - ⏸ タッチターゲット44px対応: デザイン全体に波及するため見送り（別タスク推奨）
- ✅ **`(params as any).ncode` の型ハック解消**: `SearchParams` に `ncode?: string` を追加済み
- ✅ **README がテンプレートのまま**: 日本語で全面書き換え済み

## 追加機能の提案

1. ⏸ **AI推薦機能**: ユーザー判断で今回は見送り（2026-07-13）。実装する場合は Claude API の structured outputs で「気分テキスト→検索条件」変換（`/api/ai/mood-search`）＋お気に入り好み分析の2段構成を推奨
2. ✅ **閲覧履歴（最近見た作品）**: `src/lib/history.ts` 新設。タイトル/「作品を読む」クリックで記録（最大50件）、ウェルカム画面に最大10件表示＋クリア（2026-07-13 実装）
3. ✅ **お気に入りの整理機能**: 積読/読書中/読了ステータス（`readStatus`）、フィルタータブ、ソート（追加日/更新日/タイトル）、更新チェックの個別・一括「既読にする」（2026-07-13 実装。フォルダ分けは未実装）
4. ✅ **作品詳細ページ（`/novel/[ncode]`）**: サーバーコンポーネント＋`NovelDetail.tsx`。generateMetadata で SEO 対応、404 処理あり。カードのタイトルリンクは詳細ページへ変更（2026-07-13 実装）
5. **ランキング推移グラフ**: 未実装。日間/週間/月間ポイントは取得済みなので棒グラフで「勢い」を可視化できる
6. ✅ **無限スクロール**: 検索結果で IntersectionObserver による自動追加読み込み（ページネーション併用、ORマージ結果では無効）（2026-07-13 実装）

## 残タスク

- ランキング推移グラフ（提案5）
- AI推薦機能（提案1、見送り中）
- インラインstyle全面Tailwind移行・タッチターゲット44px対応（改善点の見送り分）
- お気に入りのフォルダ/タグ分け
