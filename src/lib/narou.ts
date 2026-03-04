export interface NarouNovel {
  title: string;
  ncode: string;
  userid: number;
  writer: string;
  story: string;
  biggenre: number;
  genre: number;
  gensaku: string;
  keyword: string;
  general_firstup: string;
  general_lastup: string;
  novel_type: number;
  end: number;
  general_all_no: number;
  length: number;
  time: number;
  isstop: number;
  isreading: number;
  global_point: number;
  daily_point: number;
  weekly_point: number;
  monthly_point: number;
  quarter_point: number;
  yearly_point: number;
  fav_novel_cnt: number;
  impression_cnt: number;
  review_cnt: number;
  all_point: number;
  all_hyoka_cnt: number;
  sasie_cnt: number;
  kaiwaritu: number;
}

export interface SearchParams {
  word?: string;
  notword?: string;
  genre?: number;
  biggenre?: number;
  order?: string;
  type?: "t" | "r" | "er" | "re" | "ter" | "";
  minlen?: number;
  maxlen?: number;
  stop?: 1 | 2;
  lim?: number;
  st?: number;
  // 最終更新日フィルター (UNIX タイムスタンプ秒)
  lastup?: string; // "unixtime-unixtime" 形式
  // 検索対象制御
  title?: 1;
  ex?: 1;
  keyword?: 1;
  wname?: 1;
}

export const ORDER_OPTIONS: { value: string; label: string }[] = [
  { value: "hyoka", label: "総合ポイント順" },
  { value: "favnovelcnt", label: "ブックマーク数順" },
  { value: "reviewcnt", label: "レビュー数順" },
  { value: "hyokacnt", label: "評価数順" },
  { value: "dailypoint", label: "日間ポイント順" },
  { value: "weeklypoint", label: "週間ポイント順" },
  { value: "monthlypoint", label: "月間ポイント順" },
  { value: "quarterpoint", label: "四半期ポイント順" },
  { value: "yearlypoint", label: "年間ポイント順" },
  { value: "impressioncnt", label: "感想数順" },
  { value: "hyokaasc", label: "総合ポイント低い順" },
  { value: "new", label: "新着更新順" },
  { value: "old", label: "更新が古い順" },
  { value: "weekly", label: "毎週ランキング順" },
  { value: "lengthdesc", label: "文字数多い順" },
  { value: "lengthasc", label: "文字数少ない順" },
  { value: "ncodedesc", label: "Nコード新しい順" },
  { value: "ncodeasc", label: "Nコード古い順" },
];

// 公式API仕様に基づいたジャンルコードマッピング
export const GENRE_MAP: Record<number, string> = {
  0: "未選択",
  101: "異世界〔恋愛〕",
  102: "現実世界〔恋愛〕",
  201: "ハイファンタジー〔ファンタジー〕",
  202: "ローファンタジー〔ファンタジー〕",
  301: "純文学〔文芸〕",
  302: "ヒューマンドラマ〔文芸〕",
  303: "歴史〔文芸〕",
  304: "推理〔文芸〕",
  305: "ホラー〔文芸〕",
  306: "アクション〔文芸〕",
  307: "コメディー〔文芸〕",
  401: "VRゲーム〔SF〕",
  402: "宇宙〔SF〕",
  403: "空想科学〔SF〕",
  404: "パニック〔SF〕",
  9901: "童話〔その他〕",
  9902: "詩〔その他〕",
  9903: "エッセイ〔その他〕",
  9904: "リプレイ〔その他〕",
  9999: "その他〔その他〕",
  9801: "ノンジャンル〔ノンジャンル〕",
};

export const GENRE_GROUPS: { label: string; genres: { value: number; label: string }[] }[] = [
  {
    label: "恋愛",
    genres: [
      { value: 101, label: "異世界〔恋愛〕" },
      { value: 102, label: "現実世界〔恋愛〕" },
    ],
  },
  {
    label: "ファンタジー",
    genres: [
      { value: 201, label: "ハイファンタジー" },
      { value: 202, label: "ローファンタジー" },
    ],
  },
  {
    label: "文芸",
    genres: [
      { value: 301, label: "純文学" },
      { value: 302, label: "ヒューマンドラマ" },
      { value: 303, label: "歴史" },
      { value: 304, label: "推理" },
      { value: 305, label: "ホラー" },
      { value: 306, label: "アクション" },
      { value: 307, label: "コメディー" },
    ],
  },
  {
    label: "SF",
    genres: [
      { value: 401, label: "VRゲーム" },
      { value: 402, label: "宇宙" },
      { value: 403, label: "空想科学" },
      { value: 404, label: "パニック" },
    ],
  },
  {
    label: "その他",
    genres: [
      { value: 9901, label: "童話" },
      { value: 9902, label: "詩" },
      { value: 9903, label: "エッセイ" },
      { value: 9904, label: "リプレイ" },
      { value: 9999, label: "その他" },
    ],
  },
  {
    label: "ノンジャンル",
    genres: [
      { value: 9801, label: "ノンジャンル" },
    ],
  },
];

// 作品タイプ（連載状態フィルター）
export const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "すべて" },
  { value: "r", label: "連載中" },
  { value: "er", label: "完結済（連載）" },
  { value: "t", label: "短編" },
  { value: "re", label: "すべての連載" },
  { value: "ter", label: "短編と完結済" },
];

export interface SearchResult {
  allcount: number;
  novels: NarouNovel[];
}

export async function fetchNarouNovels(
  params: SearchParams = {}
): Promise<SearchResult> {
  const url = new URL("https://api.syosetu.com/novelapi/api/");
  url.searchParams.set("out", "json");
  url.searchParams.set("gzip", "0");
  if (!params.lim) params.lim = 20;

  const paramMap: Record<string, string | number | undefined> = {
    word: params.word,
    notword: params.notword,
    genre: params.genre,
    biggenre: params.biggenre,
    order: params.order || "hyoka",
    type: params.type,
    lim: params.lim,
    st: params.st,
    minlen: params.minlen,
    maxlen: params.maxlen,
    stop: params.stop,
    lastup: params.lastup,
    title: params.title,
    ex: params.ex,
    keyword: params.keyword,
    wname: params.wname,
    ncode: (params as any).ncode,
  };

  Object.entries(paramMap).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "NarouNovelFinder/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Narou API error: ${response.statusText}`);
    }

    const data = await response.json();
    const allcount = data[0]?.allcount ?? 0;
    const novels = data.slice(1) as NarouNovel[];
    return { allcount, novels };
  } catch (error) {
    console.error("Failed to fetch from Narou API:", error);
    return { allcount: 0, novels: [] };
  }
}
