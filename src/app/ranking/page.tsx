"use client";

import { useState, useCallback, useEffect } from "react";
import { Trophy, Loader2, AlertCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { GENRE_GROUPS, GENRE_MAP, type NarouNovel } from "@/lib/narou";
import NovelCard from "@/components/NovelCard";
import { useRouter } from "next/navigation";

const PERIODS = [
    { value: "daily", label: "日間" },
    { value: "weekly", label: "週間" },
    { value: "monthly", label: "月間" },
    { value: "quarter", label: "四半期" },
    { value: "yearly", label: "年間" },
];

const PER_PAGE = 20;

export default function RankingPage() {
    const router = useRouter();
    const [period, setPeriod] = useState("weekly");
    const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
    const [keyword, setKeyword] = useState("");
    const [notKeyword, setNotKeyword] = useState("");
    const [novels, setNovels] = useState<NarouNovel[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showGenrePicker, setShowGenrePicker] = useState(false);

    const totalPages = Math.ceil(Math.min(totalCount, 2000) / PER_PAGE);

    const fetchRanking = useCallback(async (page: number = 1, kw?: string, nkw?: string) => {
        setIsLoading(true);
        setError(null);

        // 引数が省略された場合は state の値を使う
        const effectiveKeyword = kw !== undefined ? kw : keyword;
        const effectiveNotKeyword = nkw !== undefined ? nkw : notKeyword;

        if (selectedGenres.length <= 1) {
            // 単一ジャンル or 全ジャンル
            const params = new URLSearchParams();
            params.set("period", period);
            if (selectedGenres.length === 1) params.set("genre", String(selectedGenres[0]));
            if (effectiveKeyword) params.set("word", effectiveKeyword);
            if (effectiveNotKeyword) params.set("notword", effectiveNotKeyword);
            params.set("lim", String(PER_PAGE));
            if (page > 1) params.set("st", String((page - 1) * PER_PAGE + 1));

            try {
                const res = await fetch(`/api/ranking?${params.toString()}`);
                if (!res.ok) throw new Error("ランキング取得に失敗しました");
                const data = await res.json();
                setNovels(data.novels);
                setTotalCount(data.allcount);
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: "smooth" });
            } catch (err) {
                setError(err instanceof Error ? err.message : "エラーが発生しました");
            } finally {
                setIsLoading(false);
            }
        } else {
            // 複数ジャンル横断: 各ジャンルから取得してマージ
            try {
                const perGenreLimit = Math.max(5, Math.floor(40 / selectedGenres.length));
                const promises = selectedGenres.map(async (g) => {
                    const params = new URLSearchParams();
                    params.set("period", period);
                    params.set("genre", String(g));
                    if (effectiveKeyword) params.set("word", effectiveKeyword);
                    if (effectiveNotKeyword) params.set("notword", effectiveNotKeyword);
                    params.set("lim", String(perGenreLimit));
                    const res = await fetch(`/api/ranking?${params.toString()}`);
                    if (!res.ok) return [];
                    const data = await res.json();
                    return data.novels as NarouNovel[];
                });
                const results = await Promise.all(promises);
                const allNovels = results.flat();

                // ポイント順でソート
                const pointKey = period === "daily" ? "daily_point" :
                    period === "weekly" ? "weekly_point" :
                        period === "monthly" ? "monthly_point" :
                            period === "quarter" ? "quarter_point" : "yearly_point";
                allNovels.sort((a, b) => ((b as any)[pointKey] || 0) - ((a as any)[pointKey] || 0));

                // 重複除去
                const seen = new Set<string>();
                const unique = allNovels.filter((n) => {
                    if (seen.has(n.ncode)) return false;
                    seen.add(n.ncode);
                    return true;
                });

                // 複数ジャンル時は perGenreLimit により最大40件程度に収まるため全件セットする
                setNovels(unique);
                setTotalCount(unique.length);
                setCurrentPage(1);
                window.scrollTo({ top: 0, behavior: "smooth" });
            } catch (err) {
                setError(err instanceof Error ? err.message : "エラーが発生しました");
            } finally {
                setIsLoading(false);
            }
        }
    }, [period, selectedGenres, keyword, notKeyword]);

    useEffect(() => {
        fetchRanking(1);
    }, [period, selectedGenres]);

    const handleKeywordSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchRanking(1);
    };

    const handleClear = () => {
        setKeyword("");
        setNotKeyword("");
        // state 更新は非同期のため、明示的に空文字を渡して正しく空検索する
        fetchRanking(1, "", "");
    };

    const toggleGenre = (genreId: number) => {
        setSelectedGenres((prev) =>
            prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
        );
    };

    const handleSimilarSearch = (keywords: string, genreCode: number) => {
        const params = new URLSearchParams({ word: keywords, genre: String(genreCode) });
        router.push(`/?${params.toString()}`);
    };

    const handleAuthorSearch = (authorName: string) => {
        const params = new URLSearchParams({ word: authorName, wname: "1" });
        router.push(`/?${params.toString()}`);
    };

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages) return;
        fetchRanking(page);
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
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 flex items-center justify-center" style={{ background: "rgba(184,136,58,0.12)", border: "1px solid rgba(184,136,58,0.28)", borderRadius: "4px" }}>
                        <Trophy style={{ color: "#b8883a", width: "20px", height: "20px" }} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold gradient-text">ランキング</h2>
                        <p className="text-xs text-muted">期間別ポイントランキング{selectedGenres.length > 1 && " (クロスジャンル)"}</p>
                    </div>
                </div>

                {/* Period Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {PERIODS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => { setPeriod(p.value); setCurrentPage(1); }}
                            className={`ranking-tab px-5 py-2 rounded-lg text-sm font-medium transition-all ${period === p.value
                                ? "bg-primary text-white"
                                : "text-muted hover:text-foreground"
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Genre Filter (Multi-select) */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={() => setShowGenrePicker(!showGenrePicker)}
                            className="form-input w-auto inline-flex items-center gap-2 cursor-pointer hover:border-primary/30 transition-colors"
                        >
                            <Trophy className="w-4 h-4 text-muted" />
                            {selectedGenres.length === 0
                                ? "すべてのジャンル"
                                : `${selectedGenres.length}ジャンル選択中`}
                        </button>
                        {selectedGenres.length > 0 && (
                            <>
                                {selectedGenres.map((g) => (
                                    <span
                                        key={g}
                                        className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary-light px-2 py-1 rounded-full border border-primary/20"
                                    >
                                        {(GENRE_MAP[g] || "").replace(/〔.*〕/, "")}
                                        <button onClick={() => toggleGenre(g)} className="hover:text-red-400">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                <button
                                    onClick={() => setSelectedGenres([])}
                                    className="text-xs text-muted hover:text-foreground"
                                >
                                    すべてクリア
                                </button>
                            </>
                        )}
                    </div>

                    {showGenrePicker && (
                        <div className="glass rounded-2xl p-4 mt-3">
                            {GENRE_GROUPS.map((group) => (
                                <div key={group.label} className="mb-3 last:mb-0">
                                    <h4 className="text-xs font-semibold text-muted mb-2">{group.label}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {group.genres.map((g) => (
                                            <button
                                                key={g.value}
                                                onClick={() => toggleGenre(g.value)}
                                                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${selectedGenres.includes(g.value)
                                                    ? "bg-primary/15 text-primary-light border-primary/30"
                                                    : "bg-white/5 text-muted border-border hover:text-foreground hover:border-primary/20"
                                                    }`}
                                            >
                                                {selectedGenres.includes(g.value) && "✓ "}
                                                {g.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Keyword & Exclude Filter */}
                <form onSubmit={handleKeywordSearch} className="mb-6">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="キーワード（含む）"
                                className="form-input w-full"
                            />
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={notKeyword}
                                onChange={(e) => setNotKeyword(e.target.value)}
                                placeholder="除外キーワード（含まない）"
                                className="form-input w-full border-red-500/30 focus:border-red-500/50 focus:ring-red-500/20"
                            />
                        </div>
                        <button type="submit" className="search-btn px-6 bg-primary/20 text-primary-light hover:bg-primary/30 whitespace-nowrap">
                            絞り込み
                        </button>
                        {(keyword || notKeyword) && (
                            <button type="button" onClick={handleClear} className="reset-btn px-4 bg-white/5 hover:bg-white/10 whitespace-nowrap">
                                クリア
                            </button>
                        )}
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

                {/* Ranking list */}
                {!isLoading && novels.length > 0 && (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            {selectedGenres.length > 1 ? (
                                <p className="text-sm text-muted">
                                    クロスジャンル上位 {novels.length.toLocaleString()} 作品
                                </p>
                            ) : (
                                <>
                                    <p className="text-sm text-muted">
                                        全 {totalCount.toLocaleString()} 作品
                                    </p>
                                    <p className="text-sm text-muted">
                                        {((currentPage - 1) * PER_PAGE + 1).toLocaleString()} - {Math.min(currentPage * PER_PAGE, totalCount).toLocaleString()} 位
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="space-y-4 mb-8">
                            {novels.map((novel, index) => (
                                <NovelCard
                                    key={novel.ncode}
                                    novel={novel}
                                    rank={(currentPage - 1) * PER_PAGE + index + 1}
                                    showRank
                                    onSimilarSearch={handleSimilarSearch}
                                    onAuthorSearch={handleAuthorSearch}
                                />
                            ))}
                        </div>

                        {/* Pagination（複数ジャンル選択時はマージ結果のみのため非表示） */}
                        {totalPages > 1 && selectedGenres.length <= 1 && (
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
            </div>
        </main>
    );
}
