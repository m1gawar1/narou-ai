"use client";

import { useState, useCallback, useEffect, useRef, Suspense, useMemo } from "react";
import {
  Search, Filter, RotateCcw, Loader2, AlertCircle,
  BookMarked, ChevronLeft, ChevronRight, BookOpen,
  Tag, Dices, Save, FolderOpen, X, Sparkles,
  Timer, Calendar, Share2, User, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GENRE_GROUPS,
  ORDER_OPTIONS,
  TYPE_OPTIONS,
  GENRE_MAP,
  type NarouNovel,
} from "@/lib/narou";
import { getPresets, savePreset, deletePreset, type SearchPreset } from "@/lib/presets";
import { getHistory, clearHistory, type HistoryEntry } from "@/lib/history";
import NovelCard from "@/components/NovelCard";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

const PER_PAGE = 20;

const MIN_LENGTH_OPTIONS = [
  { value: "", label: "指定なし" },
  { value: "10000", label: "1万字以上" },
  { value: "50000", label: "5万字以上" },
  { value: "100000", label: "10万字以上" },
  { value: "300000", label: "30万字以上" },
  { value: "500000", label: "50万字以上" },
  { value: "1000000", label: "100万字以上" },
];

const MAX_LENGTH_OPTIONS = [
  { value: "", label: "指定なし" },
  { value: "10000", label: "1万字以内" },
  { value: "50000", label: "5万字以内" },
  { value: "100000", label: "10万字以内" },
  { value: "300000", label: "30万字以内" },
  { value: "500000", label: "50万字以内" },
  { value: "1000000", label: "100万字以内" },
];

const READING_TIME_OPTIONS = [
  { value: "", label: "指定なし" },
  { value: "0-15000", label: "30分以内（〜1.5万字）" },
  { value: "0-30000", label: "1時間以内（〜3万字）" },
  { value: "0-150000", label: "5時間以内（〜15万字）" },
  { value: "0-240000", label: "8時間以内（〜24万字）" },
  { value: "150000-", label: "じっくり読む（15万字以上）" },
  { value: "500000-", label: "超長編（50万字以上）" },
];

const LAST_UPDATE_OPTIONS = [
  { value: "", label: "指定なし" },
  { value: "7", label: "1週間以内" },
  { value: "30", label: "1ヶ月以内" },
  { value: "90", label: "3ヶ月以内" },
  { value: "180", label: "半年以内" },
  { value: "365", label: "1年以内" },
];

const QUICK_ORDERS = [
  { value: "hyoka", label: "評価順" },
  { value: "favnovelcnt", label: "ブクマ順" },
  { value: "weeklypoint", label: "週間" },
  { value: "new", label: "新着順" },
];

export default function Home() {
  return (
    <Suspense fallback={
      <main className="min-h-screen pb-16">
        <div className="max-w-6xl mx-auto px-4 mt-8">
          <div className="glass rounded-2xl p-6 mb-8">
            <div className="skeleton h-12 w-full mb-4" />
            <div className="skeleton h-10 w-1/3" />
          </div>
        </div>
      </main>
    }>
      <SearchPageInner />
    </Suspense>
  );
}

// タグクラウドコンポーネント（複数選択 + AND/OR切替）
function TagCloud({ novels, onTagSearch }: {
  novels: NarouNovel[];
  onTagSearch: (tags: string[], mode: "and" | "or") => void;
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<"and" | "or">("and");

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    novels.forEach((novel) => {
      if (!novel.keyword) return;
      novel.keyword.split(/\s+/).forEach((kw) => {
        if (kw.trim()) counts[kw] = (counts[kw] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);
  }, [novels]);

  if (tagCounts.length === 0) return null;

  const maxCount = tagCounts[0][1];
  const minCount = tagCounts[tagCounts.length - 1][1];

  const getSize = (count: number) => {
    if (maxCount === minCount) return 14;
    const ratio = (count - minCount) / (maxCount - minCount);
    return 11 + ratio * 9;
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSearch = () => {
    if (selectedTags.length === 0) return;
    onTagSearch(selectedTags, searchMode);
  };

  return (
    <div className="glass rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Tag className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">タグクラウド</h3>
        <span className="text-xs text-muted">（検索結果から集計）</span>
        <div className="ml-auto flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => setSearchMode("and")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${searchMode === "and"
              ? "bg-primary/20 text-primary-light"
              : "text-muted hover:text-foreground"
              }`}
          >
            AND
          </button>
          <button
            onClick={() => setSearchMode("or")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${searchMode === "or"
              ? "bg-primary/20 text-primary-light"
              : "text-muted hover:text-foreground"
              }`}
          >
            OR
          </button>
        </div>
      </div>
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-muted">選択中:</span>
          {selectedTags.map((tag, i) => (
            <span key={tag} className="inline-flex items-center">
              <span className="text-xs font-medium text-primary-light bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {tag}
                <button onClick={() => toggleTag(tag)} className="ml-1 text-muted hover:text-red-400">×</button>
              </span>
              {i < selectedTags.length - 1 && (
                <span className="text-[10px] text-muted mx-1 font-bold">
                  {searchMode === "and" ? "＋" : "or"}
                </span>
              )}
            </span>
          ))}
          <button onClick={handleSearch} className="text-xs font-semibold text-white bg-primary/80 hover:bg-primary px-3 py-1 rounded-full transition-all">
            この条件で検索
          </button>
          <button onClick={() => setSelectedTags([])} className="text-xs text-muted hover:text-foreground transition-colors">
            クリア
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 justify-center">
        {tagCounts.map(([tag, count]) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-2 py-0.5 rounded-full border transition-all cursor-pointer ${isSelected
                ? "bg-primary/20 border-primary/40 text-primary-light ring-1 ring-primary/30"
                : "bg-primary/5 border-primary/10 text-primary-light hover:bg-primary/15 hover:border-primary/25"
                }`}
              style={{ fontSize: `${getSize(count)}px` }}
              title={`${tag}（${count}件）`}
            >
              {isSelected && <span className="mr-0.5">✓</span>}
              {tag}
              <span className="text-[9px] text-muted ml-1">{count}</span>
            </button>
          );
        })}
      </div>
      {selectedTags.length === 0 && (
        <p className="text-[10px] text-muted/50 text-center mt-2">
          タグをタップして選択し、AND / OR を切り替えて検索
        </p>
      )}
    </div>
  );
}


function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  // 検索フォームの状態
  const [keyword, setKeyword] = useState("");
  const [tagKeyword, setTagKeyword] = useState("");
  const [notKeyword, setNotKeyword] = useState("");
  const [genre, setGenre] = useState("");
  const [order, setOrder] = useState("hyoka");
  const [minLen, setMinLen] = useState("");
  const [maxLen, setMaxLen] = useState("");
  const [novelType, setNovelType] = useState("");
  const [readingTime, setReadingTime] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [excludeStop, setExcludeStop] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // プリセット
  const [presets, setPresets] = useState<SearchPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  // ランダムおすすめ
  const [randomNovels, setRandomNovels] = useState<NarouNovel[]>([]);
  const [isRandomLoading, setIsRandomLoading] = useState(false);
  const [showRandom, setShowRandom] = useState(false);
  const [gachaCount, setGachaCount] = useState<1 | 10>(1);

  // 検索結果
  const [novels, setNovels] = useState<NarouNovel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [similarSourceTitle, setSimilarSourceTitle] = useState<string | null>(null);
  // OR 検索のクライアント側マージ結果はページネーション不可
  const [isMergedResult, setIsMergedResult] = useState(false);

  // URL共有
  const [shareCopied, setShareCopied] = useState(false);

  // 最近見た作品（閲覧履歴）
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const totalPages = Math.ceil(Math.min(totalCount, 2000) / PER_PAGE);

  // ジャンルチップ用フラット配列
  const flatGenres = GENRE_GROUPS.flatMap((g) =>
    g.genres.map((genre) => ({ value: String(genre.value), label: genre.label, group: g.label }))
  );

  // 有効な詳細フィルター数
  const activeAdvancedCount =
    [novelType, readingTime, lastUpdate, notKeyword, tagKeyword, minLen, maxLen].filter(Boolean).length +
    (excludeStop ? 1 : 0);

  // URLパラメータから検索条件を復元（マウント時1回）
  useEffect(() => {
    setPresets(getPresets());
    setHistory(getHistory());

    const wordParam = searchParams.get("word");
    const wnameParam = searchParams.get("wname");
    const genreParam = searchParams.get("genre");
    const tagkwParam = searchParams.get("tagkw");
    const notwordParam = searchParams.get("notword");
    const orderParam = searchParams.get("order");
    const minlenParam = searchParams.get("minlen");
    const maxlenParam = searchParams.get("maxlen");
    const typeParam = searchParams.get("type");
    const rtParam = searchParams.get("rt");
    const luParam = searchParams.get("lu");
    const stopParam = searchParams.get("stop");

    // ランキング/お気に入りページからの作者検索遷移は従来どおり word+wname 検索
    if (wnameParam === "1" && wordParam) {
      setKeyword(wordParam);
      const params = new URLSearchParams();
      params.set("word", wordParam);
      params.set("wname", "1");
      params.set("order", orderParam || order);
      params.set("lim", String(PER_PAGE));
      fetchWithParams(params);
      return;
    }

    // 共有された UI パラメータのいずれかが存在する場合のみ復元
    const hasAny =
      wordParam || genreParam || tagkwParam || notwordParam || orderParam ||
      minlenParam || maxlenParam || typeParam || rtParam || luParam || stopParam;
    if (!hasAny) return;

    // 各 state を復元
    if (wordParam) setKeyword(wordParam);
    if (genreParam) setGenre(genreParam);
    if (tagkwParam) setTagKeyword(tagkwParam);
    if (notwordParam) setNotKeyword(notwordParam);
    if (orderParam) setOrder(orderParam);
    if (minlenParam) setMinLen(minlenParam);
    if (maxlenParam) setMaxLen(maxlenParam);
    if (typeParam) setNovelType(typeParam);
    if (rtParam) setReadingTime(rtParam);
    if (luParam) setLastUpdate(luParam);
    const excludeStopVal = stopParam === "1";
    if (excludeStopVal) setExcludeStop(true);

    // 詳細フィルターが復元されたらパネルを開く
    if (tagkwParam || notwordParam || minlenParam || maxlenParam || typeParam || rtParam || luParam || stopParam) {
      setShowAdvanced(true);
    }

    // 復元した値で検索を実行（lastUpdate は日数なので doSearch 内で lastup 範囲を再計算）
    doSearch(1, {
      keyword: wordParam || "",
      genre: genreParam || "",
      tagKeyword: tagkwParam || "",
      notKeyword: notwordParam || "",
      order: orderParam || order,
      minLen: minlenParam || "",
      maxLen: maxlenParam || "",
      novelType: typeParam || "",
      readingTime: rtParam || "",
      lastUpdate: luParam || "",
      excludeStop: excludeStopVal,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchWithParams = async (params: URLSearchParams) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setShowRandom(false);
    setRandomNovels([]);
    setIsMergedResult(false);
    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error("検索に失敗しました");
      const data = await res.json();
      setNovels(data.novels);
      setTotalCount(data.allcount);
      setCurrentPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setNovels([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const buildSearchParams = useCallback(
    (
      page: number = 1,
      overrides?: Partial<{
        keyword: string;
        tagKeyword: string;
        notKeyword: string;
        genre: string;
        order: string;
        minLen: string;
        maxLen: string;
        novelType: string;
        readingTime: string;
        lastUpdate: string;
        excludeStop: boolean;
      }>
    ) => {
      // overrides があれば現在の state より優先して使う（stale closure 回避）
      const v = { keyword, tagKeyword, notKeyword, genre, order, minLen, maxLen, novelType, readingTime, lastUpdate, excludeStop, ...overrides };
      const params = new URLSearchParams();
      const allWords: string[] = [];
      if (v.keyword.trim()) allWords.push(v.keyword.trim());
      if (v.tagKeyword.trim()) allWords.push(v.tagKeyword.trim());
      if (allWords.length > 0) params.set("word", allWords.join(" "));
      if (v.tagKeyword.trim() && !v.keyword.trim()) params.set("keyword", "1");
      if (v.notKeyword.trim()) params.set("notword", v.notKeyword.trim());
      if (v.genre) params.set("genre", v.genre);
      params.set("order", v.order);

      if (v.readingTime) {
        const [rtMin, rtMax] = v.readingTime.split("-");
        if (rtMin && !v.minLen) params.set("minlen", rtMin);
        if (rtMax && !v.maxLen) params.set("maxlen", rtMax);
      } else {
        if (v.minLen) params.set("minlen", v.minLen);
        if (v.maxLen) params.set("maxlen", v.maxLen);
      }

      if (v.lastUpdate) {
        const days = Number(v.lastUpdate);
        const now = Math.floor(Date.now() / 1000);
        const since = now - days * 86400;
        params.set("lastup", `${since}-${now}`);
      }

      if (v.novelType) params.set("type", v.novelType);
      if (v.excludeStop) params.set("stop", "1");
      params.set("lim", String(PER_PAGE));
      if (page > 1) params.set("st", String((page - 1) * PER_PAGE + 1));
      return params;
    },
    [keyword, tagKeyword, notKeyword, genre, order, minLen, maxLen, novelType, readingTime, lastUpdate, excludeStop]
  );

  const doSearch = useCallback(
    async (
      page: number = 1,
      overrides?: Partial<{
        keyword: string;
        tagKeyword: string;
        notKeyword: string;
        genre: string;
        order: string;
        minLen: string;
        maxLen: string;
        novelType: string;
        readingTime: string;
        lastUpdate: string;
        excludeStop: boolean;
      }>
    ) => {
      setIsLoading(true);
      setError(null);
      setHasSearched(true);
      setShowRandom(false);
      setRandomNovels([]);
      setIsMergedResult(false);
      const params = buildSearchParams(page, overrides);

      try {
        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error("検索に失敗しました");
        const data = await res.json();
        setNovels(data.novels);
        setTotalCount(data.allcount);
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
        setNovels([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    [buildSearchParams]
  );

  // 無限スクロール: 次ページを取得して既存リストに追記する
  const loadMore = useCallback(async () => {
    // 発火条件ガード
    if (!hasSearched || isLoading || isLoadingMore || isMergedResult || currentPage >= totalPages) return;
    setIsLoadingMore(true);
    const params = buildSearchParams(currentPage + 1);
    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error("追加読み込みに失敗しました");
      const data = await res.json();
      const more = (data.novels || []) as NarouNovel[];
      // ncode で重複除去しつつ追記
      setNovels((prev) => {
        const seen = new Set(prev.map((n) => n.ncode));
        const appended = more.filter((n) => !seen.has(n.ncode));
        return [...prev, ...appended];
      });
      setCurrentPage((p) => p + 1);
    } catch {
      // エラー時は静かに失敗（setError せず、ローディング状態だけ戻す）
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasSearched, isLoading, isLoadingMore, isMergedResult, currentPage, totalPages, buildSearchParams]);

  // 最新の loadMore を ref に保持（IntersectionObserver の stale closure 回避）
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  // sentinel 監視用の observer。sentinel が表示されている間に1度だけ張る
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreRef.current();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // hasSearched / isMergedResult の変化で sentinel の有無が変わるため再作成する
  }, [hasSearched, isMergedResult]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSimilarSourceTitle(null);
    doSearch(1);
  };

  const handleReset = () => {
    setKeyword(""); setTagKeyword(""); setNotKeyword("");
    setGenre(""); setOrder("hyoka"); setMinLen(""); setMaxLen(""); setNovelType("");
    setReadingTime(""); setLastUpdate(""); setExcludeStop(false);
    setShowAdvanced(false); setNovels([]); setTotalCount(0);
    setCurrentPage(1); setHasSearched(false); setError(null);
    setRandomNovels([]); setShowRandom(false);
    setSimilarSourceTitle(null);
    setIsMergedResult(false);
    router.replace("/", { scroll: false });
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    savePreset({
      name: presetName.trim(),
      keyword, tagKeyword, notKeyword, genre, order, minLen, maxLen, novelType,
    });
    setPresets(getPresets());
    setPresetName("");
    setShowSavePreset(false);
  };

  const applyPreset = (preset: SearchPreset) => {
    setKeyword(preset.keyword);
    setTagKeyword(preset.tagKeyword);
    setNotKeyword(preset.notKeyword);
    setGenre(preset.genre);
    setOrder(preset.order);
    setMinLen(preset.minLen);
    setMaxLen(preset.maxLen || "");
    setNovelType(preset.novelType);
    if (preset.tagKeyword || preset.notKeyword || preset.minLen || preset.maxLen || preset.novelType) {
      setShowAdvanced(true);
    }
    setShowPresets(false);
  };

  const handleDeletePreset = (id: string) => {
    deletePreset(id);
    setPresets(getPresets());
  };

  const handleRandom = async (count: 1 | 10 = gachaCount) => {
    setIsRandomLoading(true);
    setShowRandom(true);
    setRandomNovels([]);
    setHasSearched(false);
    setNovels([]);
    try {
      const countParams = new URLSearchParams();
      if (genre) countParams.set("genre", genre);
      if (novelType) countParams.set("type", novelType);
      if (minLen) countParams.set("minlen", minLen);
      countParams.set("lim", "1");
      countParams.set("order", "hyoka");

      const countRes = await fetch(`/api/search?${countParams.toString()}`);
      const countData = await countRes.json();
      const total = Math.min(countData.allcount, 2000);

      if (total === 0) {
        setRandomNovels([]);
        return;
      }

      const maxOffset = Math.max(1, total - count + 1);
      const randomOffset = Math.floor(Math.random() * maxOffset) + 1;
      const params = new URLSearchParams();
      if (genre) params.set("genre", genre);
      if (novelType) params.set("type", novelType);
      if (minLen) params.set("minlen", minLen);
      params.set("order", "hyoka");
      params.set("lim", String(count));
      params.set("st", String(randomOffset));

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setRandomNovels(data.novels || []);
    } catch {
      setRandomNovels([]);
    } finally {
      setIsRandomLoading(false);
    }
  };

  const handleSimilarSearch = (keywords: string, genreCode: number, title: string) => {
    setKeyword(keywords);
    setGenre(String(genreCode));
    setSimilarSourceTitle(title);
    doSearch(1, { keyword: keywords, genre: String(genreCode) });
  };

  const handleAuthorSearch = (authorName: string) => {
    setKeyword(authorName);
    setSimilarSourceTitle(null);
    const params = new URLSearchParams();
    params.set("word", authorName);
    params.set("wname", "1");
    params.set("order", order);
    params.set("lim", String(PER_PAGE));
    fetchWithParams(params);
  };

  const handleShareSearch = async () => {
    // UI state から共有 URL を組み立てる（API パラメータではなく UI レベルで共有）
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("word", keyword.trim());
    if (tagKeyword.trim()) params.set("tagkw", tagKeyword.trim());
    if (notKeyword.trim()) params.set("notword", notKeyword.trim());
    if (genre) params.set("genre", genre);
    if (order) params.set("order", order);
    if (minLen) params.set("minlen", minLen);
    if (maxLen) params.set("maxlen", maxLen);
    if (novelType) params.set("type", novelType);
    if (readingTime) params.set("rt", readingTime);
    if (lastUpdate) params.set("lu", lastUpdate);
    if (excludeStop) params.set("stop", "1");
    const shareUrl = `${window.location.origin}/?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const handleTagSearch = async (tags: string[], mode: "and" | "or") => {
    setSimilarSourceTitle(null);

    // OR 検索: なろう API は OR 非対応なのでクライアント側でマージする
    if (mode === "or" && tags.length > 1) {
      setIsLoading(true);
      setError(null);
      setHasSearched(true);
      setShowRandom(false);
      setRandomNovels([]);
      try {
        const results = await Promise.all(
          tags.map(async (tag) => {
            const params = new URLSearchParams();
            params.set("word", tag);
            params.set("order", order);
            if (genre) params.set("genre", genre);
            params.set("lim", "20");
            const res = await fetch(`/api/search?${params.toString()}`);
            if (!res.ok) throw new Error("検索に失敗しました");
            const data = await res.json();
            return (data.novels || []) as NarouNovel[];
          })
        );
        // flat → ncode で重複除去 → global_point 降順ソート
        const seen = new Set<string>();
        const merged = results
          .flat()
          .filter((n) => {
            if (seen.has(n.ncode)) return false;
            seen.add(n.ncode);
            return true;
          })
          .sort((a, b) => (b.global_point || 0) - (a.global_point || 0));
        setNovels(merged);
        setTotalCount(merged.length);
        setCurrentPage(1);
        setIsMergedResult(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
        setNovels([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // AND 検索: キーワードをスペース連結して通常検索
    setKeyword(tags.join(" "));
    doSearch(1, { keyword: tags.join(" ") });
  };

  const handleKeywordClick = (kw: string) => handleTagSearch([kw], "and");

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    doSearch(page);
  };

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <main className="min-h-screen pb-16">
      <div className="max-w-6xl mx-auto px-4 mt-4 md:mt-8">

        {/* ── Hero Gacha ─────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, rgba(26,39,68,0.96) 0%, rgba(28,50,90,0.95) 100%)",
          borderRadius: 16,
          padding: "28px 24px",
          border: "1px solid rgba(184,136,58,0.25)",
          boxShadow: "0 8px 32px rgba(24,21,15,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
          position: "relative",
          overflow: "hidden",
          marginBottom: 20,
        }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(184,136,58,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(184,136,58,0.06)", pointerEvents: "none" }} />

          <p style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(184,136,58,0.8)", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
            今日の一冊を見つけよう
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "rgba(245,241,234,0.96)", letterSpacing: "0.03em", marginBottom: 6, lineHeight: 1.3 }}>
            気分でガチャ
          </h2>
          <p style={{ fontSize: 12, color: "rgba(245,241,234,0.5)", marginBottom: 20, lineHeight: 1.6 }}>
            条件を指定しなくても、評価の高い作品からランダムにピックアップ
          </p>

          {/* 1回 / 10連 トグル */}
          <div className="flex items-center gap-2 mb-4">
            {([1, 10] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setGachaCount(n)}
                style={{
                  padding: "4px 16px",
                  borderRadius: 16,
                  border: `1px solid ${gachaCount === n ? "rgba(184,136,58,0.6)" : "rgba(255,255,255,0.18)"}`,
                  background: gachaCount === n ? "rgba(184,136,58,0.18)" : "rgba(255,255,255,0.05)",
                  color: gachaCount === n ? "rgba(245,241,234,0.95)" : "rgba(245,241,234,0.45)",
                  fontSize: 12,
                  fontWeight: gachaCount === n ? 700 : 400,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  transition: "all 0.15s",
                }}
              >
                {n === 1 ? "1回" : "10連"}
              </button>
            ))}
          </div>

          {/* ガチャボタン */}
          <div className="flex gap-2.5 flex-wrap items-center">
            <button
              onClick={() => handleRandom(gachaCount)}
              disabled={isRandomLoading}
              className="gacha-btn flex-1 flex items-center justify-center gap-2"
              style={{
                padding: "14px 24px",
                background: "linear-gradient(135deg, #b8883a 0%, #d4a655 100%)",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "0.06em",
                boxShadow: "0 4px 16px rgba(184,136,58,0.35)",
                minWidth: 140,
              }}
            >
              {isRandomLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Dices className="w-5 h-5" />}
              {isRandomLoading ? "検索中..." : gachaCount === 10 ? "10連ガチャ" : "ガチャを引く"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdvanced(true);
                setTimeout(() => searchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
              }}
              style={{
                padding: "14px 16px",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(245,241,234,0.7)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 10,
                fontSize: 13,
                letterSpacing: "0.04em",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              🎯 条件付きガチャ
            </button>
          </div>
        </div>

        {/* ── Divider ────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex-1 h-px" style={{ background: "rgba(24,21,15,0.08)" }} />
          <span style={{ fontSize: 10, color: "#7a7369", letterSpacing: "0.14em", textTransform: "uppercase" }}>または条件で検索</span>
          <div className="flex-1 h-px" style={{ background: "rgba(24,21,15,0.08)" }} />
        </div>

        {/* ── Search Section ──────────────────────────────────── */}
        <div ref={searchRef} className="glass rounded-2xl p-4 mb-6">
          {/* Search bar */}
          <form onSubmit={handleSearch}>
            <div
              className="flex items-center gap-2 mb-4"
              style={{
                background: "rgba(252,249,243,0.95)",
                border: "1px solid rgba(24,21,15,0.12)",
                borderRadius: 12,
                padding: "4px 4px 4px 14px",
                boxShadow: "0 2px 12px rgba(24,21,15,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#7a7369" }} />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="キーワードで検索..."
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 16,
                  color: "#18150f",
                  padding: "10px 0",
                }}
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#7a7369", padding: "0 4px", display: "flex", alignItems: "center" }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: "10px 20px",
                  background: "#1a2744",
                  color: "rgba(245,241,234,0.96)",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: "0.04em",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "検索"}
              </button>
            </div>
          </form>

          {/* Genre chips — horizontal scroll */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: "none" }}>
            {/* すべて */}
            <button
              type="button"
              onClick={() => setGenre("")}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${genre === "" ? "#1a2744" : "rgba(24,21,15,0.12)"}`,
                background: genre === "" ? "#1a2744" : "rgba(252,249,243,0.85)",
                color: genre === "" ? "rgba(245,241,234,0.95)" : "#7a7369",
                fontSize: 12,
                fontWeight: genre === "" ? 600 : 400,
                cursor: "pointer",
                letterSpacing: "0.03em",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              すべて
            </button>
            {flatGenres.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGenre(g.value)}
                style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1px solid ${genre === g.value ? "#1a2744" : "rgba(24,21,15,0.12)"}`,
                  background: genre === g.value ? "#1a2744" : "rgba(252,249,243,0.85)",
                  color: genre === g.value ? "rgba(245,241,234,0.95)" : "#7a7369",
                  fontSize: 12,
                  fontWeight: genre === g.value ? 600 : 400,
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
                title={g.group}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Order chips + advanced toggle */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span style={{ fontSize: 11, color: "#7a7369", flexShrink: 0 }}>並び：</span>
            {QUICK_ORDERS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setOrder(o.value)}
                style={{
                  flexShrink: 0,
                  padding: "4px 10px",
                  borderRadius: 16,
                  border: `1px solid ${order === o.value ? "#b8883a" : "rgba(24,21,15,0.10)"}`,
                  background: order === o.value ? "rgba(184,136,58,0.10)" : "transparent",
                  color: order === o.value ? "#7a5c1a" : "#7a7369",
                  fontSize: 11,
                  fontWeight: order === o.value ? 600 : 400,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                  transition: "all 0.15s",
                }}
              >
                {o.label}
              </button>
            ))}

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1"
              style={{
                marginLeft: "auto",
                padding: "4px 12px",
                borderRadius: 16,
                border: `1px solid ${activeAdvancedCount > 0 ? "#1a2744" : "rgba(24,21,15,0.12)"}`,
                background: activeAdvancedCount > 0 ? "rgba(26,39,68,0.07)" : "transparent",
                color: activeAdvancedCount > 0 ? "#1a2744" : "#7a7369",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                letterSpacing: "0.02em",
                flexShrink: 0,
              }}
            >
              <Filter className="w-3 h-3" />
              詳細フィルター
              {activeAdvancedCount > 0 && (
                <span style={{
                  background: "#1a2744",
                  color: "white",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                }}>{activeAdvancedCount}</span>
              )}
              <span style={{ fontSize: 10, opacity: 0.6 }}>{showAdvanced ? "▲" : "▼"}</span>
            </button>
          </div>

          {/* Advanced panel */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-3 border-t border-border">
                  {/* Preset / Share / Save controls */}
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowPresets(!showPresets)}
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      プリセット ({presets.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleShareSearch}
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {shareCopied ? <span className="text-green-400">コピー！</span> : "共有"}
                    </button>
                    {showSavePreset ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                          placeholder="プリセット名"
                          className="form-input w-32 py-1 text-xs"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSavePreset(); } }}
                        />
                        <button type="button" onClick={handleSavePreset} className="text-xs text-primary hover:text-primary-light">保存</button>
                        <button type="button" onClick={() => setShowSavePreset(false)} className="text-xs text-muted">取消</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSavePreset(true)}
                        className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        条件を保存
                      </button>
                    )}
                  </div>

                  {/* Presets list */}
                  <AnimatePresence>
                    {showPresets && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="mb-4 pb-3 border-b border-border">
                          {presets.length === 0 ? (
                            <p className="text-xs text-muted">保存されたプリセットはありません</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {presets.map((p) => (
                                <div key={p.id} className="flex items-center gap-1 rounded-xl border px-3 py-1.5 group" style={{ background: "rgba(0,119,237,0.06)", borderColor: "rgba(0,119,237,0.15)" }}>
                                  <button type="button" onClick={() => applyPreset(p)} className="text-xs text-foreground hover:text-primary transition-colors">{p.name}</button>
                                  <button type="button" onClick={() => handleDeletePreset(p.id)} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3 h-3 text-muted hover:text-red-400" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Advanced filters grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div>
                      <label className="text-xs text-muted mb-1 block">
                        <Tag className="w-3 h-3 inline mr-1" />タグ・キーワード検索
                      </label>
                      <input type="text" value={tagKeyword} onChange={(e) => setTagKeyword(e.target.value)} placeholder="タグで絞り込み" className="form-input" />
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">除外キーワード</label>
                      <input type="text" value={notKeyword} onChange={(e) => setNotKeyword(e.target.value)} placeholder="除外したいワード" className="form-input" />
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">最低文字数</label>
                      <select value={minLen} onChange={(e) => setMinLen(e.target.value)} className="form-input" disabled={!!readingTime}>
                        {MIN_LENGTH_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">最大文字数</label>
                      <select value={maxLen} onChange={(e) => setMaxLen(e.target.value)} className="form-input" disabled={!!readingTime}>
                        {MAX_LENGTH_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">作品タイプ</label>
                      <select value={novelType} onChange={(e) => setNovelType(e.target.value)} className="form-input">
                        {TYPE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">
                        <Timer className="w-3 h-3 inline mr-1" />読了時間
                      </label>
                      <select
                        value={readingTime}
                        onChange={(e) => { setReadingTime(e.target.value); if (e.target.value) { setMinLen(""); setMaxLen(""); } }}
                        className="form-input"
                      >
                        {READING_TIME_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">
                        <Calendar className="w-3 h-3 inline mr-1" />最終更新日
                      </label>
                      <select value={lastUpdate} onChange={(e) => setLastUpdate(e.target.value)} className="form-input">
                        {LAST_UPDATE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">並び順（詳細）</label>
                      <select value={order} onChange={(e) => setOrder(e.target.value)} className="form-input">
                        {ORDER_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={excludeStop}
                          onChange={(e) => setExcludeStop(e.target.checked)}
                          className="w-4 h-4 rounded border-border bg-surface accent-primary cursor-pointer"
                        />
                        <span className="text-xs text-muted">長期停止中を除外</span>
                      </label>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => doSearch(1)}
                      disabled={isLoading}
                      className="search-btn flex items-center gap-1.5"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      この条件で検索
                    </button>
                    <button type="button" onClick={handleReset} className="reset-btn flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4" />
                      リセット
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* ── Gacha Results ────────────────────────────────────── */}
        {isRandomLoading && (
          <div className="space-y-4 mb-8">
            {[...Array(gachaCount === 10 ? 4 : 1)].map((_, i) => (
              <div key={i} className="glass rounded-xl p-6">
                <div className="skeleton h-6 w-2/3 mb-3" />
                <div className="skeleton h-4 w-1/3 mb-4" />
                <div className="skeleton h-4 w-full mb-2" />
                <div className="skeleton h-4 w-4/5" />
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showRandom && randomNovels.length > 0 && !isRandomLoading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-4 justify-center">
                <Sparkles className="w-4 h-4" style={{ color: "#b8883a" }} />
                <span className="text-sm font-semibold" style={{ color: "#b8883a" }}>
                  {randomNovels.length === 1 ? "あなたへのおすすめ" : `${randomNovels.length}作品をピックアップ`}
                </span>
                <Sparkles className="w-4 h-4" style={{ color: "#b8883a" }} />
              </div>
              <div className={randomNovels.length === 1 ? "max-w-2xl mx-auto" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                {randomNovels.map((novel, i) => (
                  <motion.div
                    key={novel.ncode}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                  >
                    <NovelCard
                      novel={novel}
                      onSimilarSearch={handleSimilarSearch}
                      onAuthorSearch={handleAuthorSearch}
                      onKeywordClick={handleKeywordClick}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showRandom && !isRandomLoading && randomNovels.length === 0 && (
          <p className="text-muted text-center mb-8 text-sm">条件に合う作品が見つかりませんでした</p>
        )}

        {/* ── Search Loading ───────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass rounded-xl p-6">
                <div className="skeleton h-6 w-2/3 mb-3" />
                <div className="skeleton h-4 w-1/3 mb-4" />
                <div className="skeleton h-4 w-full mb-2" />
                <div className="skeleton h-4 w-4/5" />
              </div>
            ))}
          </div>
        )}

        {/* ── Search Results ───────────────────────────────────── */}
        {!isLoading && hasSearched && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {similarSourceTitle ? (
                    <>
                      <span className="text-accent">「{similarSourceTitle}」</span>
                      <span className="text-sm font-normal text-muted ml-1">に似た作品</span>
                    </>
                  ) : "検索結果"}
                  <span className="text-primary ml-2 text-base num-badge">{totalCount.toLocaleString()}件</span>
                </h2>
              </div>
              {totalCount > 0 && (
                <p className="text-sm text-muted">
                  {novels.length.toLocaleString()} 件表示中
                </p>
              )}
            </div>

            {novels.length > 0 && (
              <TagCloud novels={novels} onTagSearch={handleTagSearch} />
            )}

            {novels.length > 0 ? (
              <div className="space-y-4 mb-8">
                {novels.map((novel) => (
                  <NovelCard
                    key={novel.ncode}
                    novel={novel}
                    onSimilarSearch={handleSimilarSearch}
                    onAuthorSearch={handleAuthorSearch}
                    onKeywordClick={handleKeywordClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
                  <Search className="w-8 h-8 text-muted" />
                </div>
                <p className="text-lg text-muted">検索結果が見つかりませんでした</p>
                <p className="text-sm text-muted/60 mt-1">条件を変更してお試しください</p>
              </div>
            )}

            {/* 無限スクロール用 sentinel（OR マージ結果では監視しない） */}
            {!isMergedResult && (
              <div ref={sentinelRef} className="flex items-center justify-center py-2">
                {isLoadingMore && (
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    読み込み中...
                  </span>
                )}
              </div>
            )}

            {/* Pagination（OR マージ結果はページネーション不可） */}
            {totalPages > 1 && !isMergedResult && (
              <nav className="flex items-center justify-center gap-2 mt-8 mb-4 flex-wrap">
                <button className="page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {getPageNumbers().map((pageNum, i) =>
                  pageNum === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted">...</span>
                  ) : (
                    <button
                      key={pageNum}
                      className={`page-btn ${currentPage === pageNum ? "active" : ""}`}
                      onClick={() => goToPage(pageNum as number)}
                    >
                      {pageNum}
                    </button>
                  )
                )}
                <button className="page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            )}
          </>
        )}

        {/* ── Welcome state ───────────────────────────────────── */}
        {!hasSearched && !isLoading && !showRandom && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-border">
              <BookOpen className="w-10 h-10 text-primary-light" />
            </div>
            <h2 className="text-2xl font-bold gradient-text mb-3">
              小説家になろうの作品を探そう
            </h2>
            <p className="text-muted max-w-md mx-auto leading-relaxed mb-6">
              上のガチャでランダム発見、またはキーワード・ジャンルで絞り込んで
              <br />
              お気に入りの小説を見つけましょう
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {["異世界転生", "悪役令嬢", "追放", "スローライフ", "最強主人公"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setKeyword(tag); doSearch(1, { keyword: tag }); }}
                  className="tag-chip text-sm py-1.5 px-4 cursor-pointer hover:bg-primary/20 hover:border-primary/30 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* 最近見た作品 */}
            {history.length > 0 && (
              <div className="max-w-3xl mx-auto mt-10 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4" style={{ color: "#b8883a" }} />
                  <h3 className="text-sm font-semibold" style={{ color: "#1a2744" }}>最近見た作品</h3>
                  <button
                    type="button"
                    onClick={() => { clearHistory(); setHistory([]); }}
                    className="ml-auto text-xs text-muted hover:text-foreground transition-colors"
                  >
                    履歴をクリア
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {history.slice(0, 10).map((h) => (
                    <Link
                      key={h.ncode}
                      href={`/novel/${h.ncode.toLowerCase()}`}
                      className="block rounded-xl px-3 py-2 transition-all hover:bg-primary/10"
                      style={{
                        background: "rgba(252,249,243,0.85)",
                        border: "1px solid rgba(24,21,15,0.10)",
                      }}
                    >
                      <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>{h.title}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "#7a7369" }}>{h.writer}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
