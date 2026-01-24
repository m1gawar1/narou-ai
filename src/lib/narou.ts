export interface NarouNovel {
  title: string;
  ncode: string;
  userid: number;
  writer: string;
  story: string;
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
  review_cnt: number;
  all_point: number;
  all_hyoka_cnt: number;
  sasie_cnt: number;
  kaihyo_sou_point: number;
}

export const GENRE_MAP: Record<number, string> = {
  101: "異世界〔恋愛〕",
  102: "現実世界〔恋愛〕",
  201: "ハイファンタジー〔ファンタジー〕",
  202: "ローファンタジー〔ファンタジー〕",
  301: "文芸〔文芸〕",
  302: "アクション〔文芸〕",
  303: "コメディー〔文芸〕",
  304: "ヒューマンドラマ〔文芸〕",
  305: "ミステリー〔文芸〕",
  306: "ホラー〔文芸〕",
  307: "短編〔文芸〕",
  401: "歴史〔歴史〕",
  402: "推理〔歴史〕",
  403: "戦記〔歴史〕",
  404: "ノンフィクション〔歴史〕",
  9901: "童話〔その他〕",
  9902: "詩〔その他〕",
  9903: "エッセイ〔その他〕",
  9904: "リプレイ〔その他〕",
  9999: "その他〔その他〕",
  9801: "空想科学〔パニック〕",
  9001: "VRゲーム〔SF〕",
  9002: "宇宙〔SF〕",
  9003: "空想科学〔SF〕",
  9004: "パニック〔SF〕",
};

export async function fetchNarouNovels(params: Record<string, string | number> = {}): Promise<NarouNovel[]> {
  const url = new URL("https://api.syosetu.com/novelapi/api/");
  url.searchParams.set("out", "json");
  url.searchParams.set("gzip", "5");
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "Accept-Encoding": "gzip",
        "User-Agent": "NarouAI-Recommender/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Narou API error: ${response.statusText}`);
    }

    const data = await response.json();
    // 最初の要素は全件数を含むオブジェクトなので除外する
    return data.slice(1);
  } catch (error) {
    console.error("Failed to fetch from Narou API:", error);
    return [];
  }
}
