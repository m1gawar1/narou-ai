"use client";

import { useState, useCallback, useEffect, Suspense, useMemo } from "react";
import {
  Search, Filter, RotateCcw, Loader2, AlertCircle,
  BookMarked, ChevronLeft, ChevronRight, BookOpen,
  Tag, Dices, Save, FolderOpen, X, Sparkles,
  Timer, Calendar, Share2, User
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
import NovelCard from "@/components/NovelCard";
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

// 読了時間フィルターオプション（文字数ベース、500字/分で計算）
const READING_TIME_OPTIONS = [
  { value: "", label: "指定なし" },
  { value: "0-15000", label: "30分以内（〜1.5万字）" },
  { value: "0-30000", label: "1時間以内（〜3万字）" },
  { value: "0-150000", label: "5時間以内（〜15万字）" },
  { value: "0-240000", label: "8時間以内（〜24万字）" },
  { value: "150000-", label: "じっくり読む（15万字以上）" },
  { value: "500000-", label: "超長編（50万字以上）" },
];

// 最終更新日フィルターオプション
const LAST_UPDATE_OPTIONS = [
  { value: "", label: "指定なし" },
  { value: "7", label: "1週間以内" },
  { value: "30", label: "1ヶ月以内" },
  { value: "90", label: "3ヶ月以内" },
  { value: "180", label: "半年以内" },
  { value: "365", label: "1年以内" },
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

  const handleSingleClick = (tag: string) => {
    if (selectedTags.length === 0) {
      // シングルクリック時はそのまま即検索
      onTagSearch([tag], "and");
    } else {
      toggleTag(tag);
    }
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
      {/* Selected tags summary */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-muted">選択中:</span>
          {selectedTags.map((tag, i) => (
            <span key={tag} className="inline-flex items-center">
              <span className="text-xs font-medium text-primary-light bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="ml-1 text-muted hover:text-red-400"
                >
                  ×
                </button>
              </span>
              {i < selectedTags.length - 1 && (
                <span className="text-[10px] text-muted mx-1 font-bold">
                  {searchMode === "and" ? "＋" : "or"}
                </span>
              )}
            </span>
          ))}
          <button
            onClick={handleSearch}
            className="text-xs font-semibold text-white bg-primary/80 hover:bg-primary px-3 py-1 rounded-full transition-all"
          >
            この条件で検索
          </button>
          <button
            onClick={() => setSelectedTags([])}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
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
              onClick={() => handleSingleClick(tag)}
              onContextMenu={(e) => { e.preventDefault(); toggleTag(tag); }}
              className={`px-2 py-0.5 rounded-full border transition-all cursor-pointer ${isSelected
                ? "bg-primary/20 border-primary/40 text-primary-light ring-1 ring-primary/30"
                : "bg-primary/5 border-primary/10 text-primary-light hover:bg-primary/15 hover:border-primary/25"
                }`}
              style={{ fontSize: `${getSize(count)}px` }}
              title={`${tag}（${count}件）/ 右クリックで複数選択`}
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
          クリックで即検索 / 右クリックで複数選択してAND・OR検索
        </p>
      )}
    </div>
  );
}


function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

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
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [similarSourceTitle, setSimilarSourceTitle] = useState<string | null>(null);


  // URL共有
  const [shareCopied, setShareCopied] = useState(false);

  const totalPages = Math.ceil(Math.min(totalCount, 2000) / PER_PAGE);

  // URLパラメータから検索条件を復元
  useEffect(() => {
    const wordParam = searchParams.get("word");
    const genreParam = searchParams.get("genre");
    if (wordParam || genreParam) {
      if (wordParam) setKeyword(wordParam);
      if (genreParam) setGenre(genreParam);
      setTimeout(() => {
        const params = new URLSearchParams();
        if (wordParam) params.set("word", wordParam);
        if (genreParam) params.set("genre", genreParam);
        params.set("order", "hyoka");
        params.set("lim", String(PER_PAGE));
        fetchWithParams(params);
      }, 100);
    }
    setPresets(getPresets());
  }, []);

  const fetchWithParams = async (params: URLSearchParams) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
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
    (page: number = 1) => {
      const params = new URLSearchParams();
      const allWords: string[] = [];
      if (keyword.trim()) allWords.push(keyword.trim());
      if (tagKeyword.trim()) allWords.push(tagKeyword.trim());
      if (allWords.length > 0) params.set("word", allWords.join(" "));
      if (tagKeyword.trim() && !keyword.trim()) params.set("keyword", "1");
      if (notKeyword.trim()) params.set("notword", notKeyword.trim());
      if (genre) params.set("genre", genre);
      params.set("order", order);

      // 読了時間フィルター → 文字数に変換
      if (readingTime) {
        const [rtMin, rtMax] = readingTime.split("-");
        if (rtMin && !minLen) params.set("minlen", rtMin);
        if (rtMax && !maxLen) params.set("maxlen", rtMax);
      } else {
        if (minLen) params.set("minlen", minLen);
        if (maxLen) params.set("maxlen", maxLen);
      }

      // 最終更新日フィルター
      if (lastUpdate) {
        const days = Number(lastUpdate);
        const now = Math.floor(Date.now() / 1000);
        const since = now - days * 86400;
        params.set("lastup", `${since}-${now}`);
      }

      if (novelType) params.set("type", novelType);
      if (excludeStop) params.set("stop", "1");
      params.set("lim", String(PER_PAGE));
      if (page > 1) params.set("st", String((page - 1) * PER_PAGE + 1));
      return params;
    },
    [keyword, tagKeyword, notKeyword, genre, order, minLen, maxLen, novelType, readingTime, lastUpdate, excludeStop]
  );

  const doSearch = useCallback(
    async (page: number = 1) => {
      setIsLoading(true);
      setError(null);
      setHasSearched(true);
      const params = buildSearchParams(page);

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
    router.replace("/", { scroll: false });
  };

  // プリセット保存
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

  // プリセット適用
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

  // プリセット削除
  const handleDeletePreset = (id: string) => {
    deletePreset(id);
    setPresets(getPresets());
  };

  // ランダムおすすめ
  const handleRandom = async (count: 1 | 10 = gachaCount) => {
    setIsRandomLoading(true);
    setShowRandom(true);
    setRandomNovels([]);
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

      // 10連の場合はランダムなオフセットから10件まとめて取得
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
    setTimeout(() => doSearch(1), 0);
  };

  // 作者検索
  const handleAuthorSearch = (authorName: string) => {
    setKeyword(authorName);
    setSimilarSourceTitle(null);
    // wnameパラメータを使って作者名で検索
    const params = new URLSearchParams();
    params.set("word", authorName);
    params.set("wname", "1");
    params.set("order", order);
    params.set("lim", String(PER_PAGE));
    fetchWithParams(params);
  };

  // URL共有
  const handleShareSearch = async () => {
    const params = buildSearchParams();
    const shareUrl = `${window.location.origin}/?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // フォールバック
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


  const handleTagSearch = (tags: string[], mode: "and" | "or") => {
    if (mode === "and") {
      setKeyword(tags.join(" "));
    } else {
      // OR検索: 各タグをスペース区切りで設定
      setKeyword(tags.join(" "));
    }
    setSimilarSourceTitle(null);
    setTimeout(() => doSearch(1), 0);
  };


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
      <div className="max-w-6xl mx-auto px-4 mt-8">
        {/* Search Panel */}
        <form onSubmit={handleSearch} className="glass rounded-3xl p-6 mb-8">
          {/* Main search row */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="キーワードで検索（例: 異世界 転生 チート）"
                className="form-input pl-11"
              />
            </div>
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className="form-input md:w-56">
              <option value="">すべてのジャンル</option>
              {GENRE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.genres.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select value={order} onChange={(e) => setOrder(e.target.value)} className="form-input md:w-48">
              {ORDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Advanced & Presets toggle */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              <Filter className="w-4 h-4" />
              詳細フィルター
              <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              プリセット ({presets.length})
            </button>
          </div>

          {/* Presets panel */}
          <AnimatePresence>
            {showPresets && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mb-4 pb-4 border-b border-border">
                  {presets.length === 0 ? (
                    <p className="text-sm text-muted">保存されたプリセットはありません</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {presets.map((p) => (
                        <div key={p.id} className="flex items-center gap-1 rounded-xl border px-3 py-1.5 group" style={{ background: "rgba(0,119,237,0.06)", borderColor: "rgba(0,119,237,0.15)" }}>
                          <button
                            type="button"
                            onClick={() => applyPreset(p)}
                            className="text-sm text-foreground hover:text-primary transition-colors"
                          >
                            {p.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePreset(p.id)}
                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
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

          {/* Advanced filters */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 pb-4 border-b border-border">
                  <div>
                    <label className="text-xs text-muted mb-1 block">
                      <Tag className="w-3 h-3 inline mr-1" />
                      タグ・キーワード検索
                    </label>
                    <input
                      type="text"
                      value={tagKeyword}
                      onChange={(e) => setTagKeyword(e.target.value)}
                      placeholder="タグで絞り込み"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">除外キーワード</label>
                    <input
                      type="text"
                      value={notKeyword}
                      onChange={(e) => setNotKeyword(e.target.value)}
                      placeholder="除外したいワード"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">最低文字数</label>
                    <select value={minLen} onChange={(e) => setMinLen(e.target.value)} className="form-input" disabled={!!readingTime}>
                      {MIN_LENGTH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">最大文字数</label>
                    <select value={maxLen} onChange={(e) => setMaxLen(e.target.value)} className="form-input" disabled={!!readingTime}>
                      {MAX_LENGTH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">作品タイプ</label>
                    <select value={novelType} onChange={(e) => setNovelType(e.target.value)} className="form-input">
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">
                      <Timer className="w-3 h-3 inline mr-1" />
                      読了時間
                    </label>
                    <select
                      value={readingTime}
                      onChange={(e) => { setReadingTime(e.target.value); if (e.target.value) { setMinLen(""); setMaxLen(""); } }}
                      className="form-input"
                    >
                      {READING_TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      最終更新日
                    </label>
                    <select value={lastUpdate} onChange={(e) => setLastUpdate(e.target.value)} className="form-input">
                      {LAST_UPDATE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={isLoading} className="search-btn flex items-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              検索
            </button>
            <button type="button" onClick={handleReset} className="reset-btn flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              リセット
            </button>
            {/* Save Preset */}
            {showSavePreset ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="プリセット名"
                  className="form-input w-40 py-2 text-sm"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSavePreset(); } }}
                />
                <button type="button" onClick={handleSavePreset} className="text-sm text-primary hover:text-primary-light">保存</button>
                <button type="button" onClick={() => setShowSavePreset(false)} className="text-sm text-muted">取消</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSavePreset(true)}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
              >
                <Save className="w-4 h-4" />
                条件を保存
              </button>
            )}
            {/* URL共有 */}
            <button
              type="button"
              onClick={handleShareSearch}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
              title="検索条件をURLとしてコピー"
            >
              <Share2 className="w-4 h-4" />
              {shareCopied ? <span className="text-green-400">コピーしました！</span> : "共有"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading */}
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

        {/* Results */}
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
                  ) : (
                    "検索結果"
                  )}
                  <span className="text-primary ml-2 text-base num-badge">{totalCount.toLocaleString()}件</span>
                </h2>
              </div>
              {totalCount > 0 && (
                <p className="text-sm text-muted">
                  {((currentPage - 1) * PER_PAGE + 1).toLocaleString()} - {Math.min(currentPage * PER_PAGE, totalCount).toLocaleString()} 件目
                </p>
              )}
            </div>

            {/* Tag Cloud */}
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

            {/* Pagination */}
            {totalPages > 1 && (
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

        {/* Welcome + Random */}
        {!hasSearched && !isLoading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-border">
              <BookOpen className="w-10 h-10 text-primary-light" />
            </div>
            <h2 className="text-2xl font-bold gradient-text mb-3">
              小説家になろうの作品を探そう
            </h2>
            <p className="text-muted max-w-md mx-auto leading-relaxed mb-6">
              キーワード、ジャンル、並び順などの条件を設定して
              <br />
              お気に入りの小説を見つけましょう
            </p>

            {/* Quick search tags */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {["異世界転生", "悪役令嬢", "追放", "スローライフ", "最強主人公"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setKeyword(tag); setTimeout(() => doSearch(1), 0); }}
                  className="tag-chip text-sm py-1.5 px-4 cursor-pointer hover:bg-primary/20 hover:border-primary/30 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Random recommendation */}
            <div className="max-w-lg mx-auto">
              {/* 回数セレクター */}
              <div className="flex items-center justify-center gap-2 mb-3">
                {([1, 10] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setGachaCount(n)}
                    className="px-5 py-1.5 rounded text-sm font-semibold transition-all"
                    style={{
                      background: gachaCount === n ? "rgba(26,39,68,0.10)" : "transparent",
                      color: gachaCount === n ? "#1a2744" : "#7a7369",
                      border: `1px solid ${gachaCount === n ? "rgba(26,39,68,0.22)" : "rgba(24,21,15,0.12)"}`,
                    }}
                  >
                    {n === 1 ? "1回" : "10連"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleRandom(gachaCount)}
                disabled={isRandomLoading}
                className="gacha-btn w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3"
              >
                {isRandomLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Dices className="w-6 h-6" />
                )}
                {gachaCount === 10 ? "🎲 10連ガチャ" : "🎲 ランダムおすすめガチャ"}
              </button>
              <p className="text-xs text-muted mt-2">ジャンルや文字数の条件はフォームで設定できます</p>
            </div>

            {/* Random results */}
            <AnimatePresence>
              {showRandom && randomNovels.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-8 max-w-4xl mx-auto text-left"
                >
                  <div className="flex items-center gap-2 mb-4 justify-center">
                    <Sparkles className="w-4 h-4" style={{ color: "#b8883a" }} />
                    <span className="text-sm font-semibold" style={{ color: "#b8883a" }}>
                      {randomNovels.length === 1 ? "あなたへのおすすめ" : `${randomNovels.length}作品をピックアップ`}
                    </span>
                    <Sparkles className="w-4 h-4" style={{ color: "#b8883a" }} />
                  </div>
                  <div className={randomNovels.length === 1
                    ? "max-w-2xl mx-auto"
                    : "grid grid-cols-1 md:grid-cols-2 gap-4"
                  }>
                    {randomNovels.map((novel, i) => (
                      <motion.div
                        key={novel.ncode}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.25 }}
                      >
                        <NovelCard novel={novel} onSimilarSearch={handleSimilarSearch} onAuthorSearch={handleAuthorSearch} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {showRandom && !isRandomLoading && randomNovels.length === 0 && (
              <p className="text-muted mt-4">条件に合う作品が見つかりませんでした</p>
            )}
          </div>
        )}
      </div>

    </main>
  );
}
