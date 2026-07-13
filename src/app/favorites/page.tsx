"use client";

import { useState, useEffect, useMemo } from "react";
import { Heart, RefreshCw, Loader2, Bell, BellOff, Download, Upload, Check } from "lucide-react";
import { getFavorites, setFavoriteStatus, markFavoriteAsChecked, type FavoriteNovel } from "@/lib/favorites";
import { type NarouNovel } from "@/lib/narou";
import NovelCard from "@/components/NovelCard";
import { useRouter } from "next/navigation";

interface UpdateInfo {
    ncode: string;
    hasUpdate: boolean;
    newLastup?: string;
    newEpisodes?: number;
    newTotalEpisodes?: number;
}

type ReadStatus = "unread" | "reading" | "finished";

// ステータスフィルタータブの定義
const STATUS_TABS: { value: ReadStatus | "all"; label: string }[] = [
    { value: "all", label: "すべて" },
    { value: "unread", label: "積読" },
    { value: "reading", label: "読書中" },
    { value: "finished", label: "読了" },
];

// ソート方法の定義
type SortOrder = "addedDesc" | "addedAsc" | "updatedDesc" | "titleAsc";

export default function FavoritesPage() {
    const router = useRouter();
    const [favorites, setFavorites] = useState<FavoriteNovel[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [updateInfos, setUpdateInfos] = useState<Record<string, UpdateInfo>>({});
    const [lastChecked, setLastChecked] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<ReadStatus | "all">("all");
    const [sortOrder, setSortOrder] = useState<SortOrder>("addedDesc");

    useEffect(() => {
        setFavorites(getFavorites());
        setLoaded(true);
        // 最終チェック時刻を復元
        const saved = localStorage.getItem("narou-finder-last-update-check");
        if (saved) setLastChecked(saved);
    }, []);

    const handleSimilarSearch = (keywords: string, genreCode: number) => {
        const params = new URLSearchParams({ word: keywords, genre: String(genreCode) });
        router.push(`/?${params.toString()}`);
    };

    const handleAuthorSearch = (authorName: string) => {
        const params = new URLSearchParams({ word: authorName, wname: "1" });
        router.push(`/?${params.toString()}`);
    };

    // 更新チェック
    const checkUpdates = async () => {
        if (favorites.length === 0) return;
        setIsChecking(true);

        try {
            // ncodeリストを分割してAPIに問い合わせ（最大20件ずつ）
            const chunks: FavoriteNovel[][] = [];
            for (let i = 0; i < favorites.length; i += 20) {
                chunks.push(favorites.slice(i, i + 20));
            }

            const allInfos: Record<string, UpdateInfo> = {};
            for (const chunk of chunks) {
                const ncodes = chunk.map((f) => f.ncode).join("-");
                const res = await fetch(`/api/search?ncode=${ncodes}&lim=${chunk.length}`);
                if (!res.ok) continue;
                const data = await res.json();
                const novels = data.novels as NarouNovel[];

                for (const fav of chunk) {
                    const latest = novels.find((n) => n.ncode === fav.ncode);
                    if (!latest) {
                        allInfos[fav.ncode] = { ncode: fav.ncode, hasUpdate: false };
                        continue;
                    }
                    const hasUpdate = latest.general_lastup !== fav.general_lastup ||
                        latest.general_all_no !== fav.general_all_no;
                    allInfos[fav.ncode] = {
                        ncode: fav.ncode,
                        hasUpdate,
                        newLastup: latest.general_lastup,
                        newEpisodes: hasUpdate ? latest.general_all_no - fav.general_all_no : 0,
                        newTotalEpisodes: latest.general_all_no,
                    };
                }
            }

            setUpdateInfos(allInfos);
            const now = new Date().toLocaleString("ja-JP");
            setLastChecked(now);
            localStorage.setItem("narou-finder-last-update-check", now);
        } catch {
            // silently fail
        } finally {
            setIsChecking(false);
        }
    };

    // 1作品を既読にする（更新チェックで得た最新情報を保存データへ反映）
    const markAsRead = (ncode: string) => {
        const info = updateInfos[ncode];
        if (!info || !info.hasUpdate || !info.newLastup || info.newTotalEpisodes === undefined) return;
        markFavoriteAsChecked(ncode, info.newLastup, info.newTotalEpisodes);
        setFavorites(getFavorites());
        setUpdateInfos((prev) => ({
            ...prev,
            [ncode]: { ...prev[ncode], hasUpdate: false },
        }));
    };

    // 更新のあった全作品をまとめて既読にする
    const markAllAsRead = () => {
        Object.values(updateInfos)
            .filter((u) => u.hasUpdate)
            .forEach((u) => {
                if (u.newLastup && u.newTotalEpisodes !== undefined) {
                    markFavoriteAsChecked(u.ncode, u.newLastup, u.newTotalEpisodes);
                }
            });
        setFavorites(getFavorites());
        setUpdateInfos((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
                next[key] = { ...next[key], hasUpdate: false };
            }
            return next;
        });
    };

    // 作品の読書ステータスを切り替える
    const handleStatusChange = (ncode: string, status: ReadStatus) => {
        setFavoriteStatus(ncode, status);
        setFavorites(getFavorites());
    };

    // お気に入りエクスポート
    const handleExport = () => {
        const data = JSON.stringify(favorites, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `narou-favorites-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // お気に入りインポート
    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const imported = JSON.parse(text) as FavoriteNovel[];
                if (!Array.isArray(imported)) return;
                // 既存と結合（重複除去）
                const existing = getFavorites();
                const existingCodes = new Set(existing.map((f) => f.ncode));
                const newFavs = imported.filter((f) => !existingCodes.has(f.ncode));
                const merged = [...existing, ...newFavs];
                localStorage.setItem("narou-finder-favorites", JSON.stringify(merged));
                setFavorites(merged);
            } catch {
                // invalid file
            }
        };
        input.click();
    };

    // FavoriteNovelをNarouNovelに変換
    const toNarouNovel = (fav: FavoriteNovel): NarouNovel => ({
        ...fav,
        userid: 0,
        biggenre: 0,
        gensaku: "",
        time: 0,
        isreading: 0,
        daily_point: 0,
        weekly_point: 0,
        monthly_point: 0,
        quarter_point: 0,
        yearly_point: 0,
        impression_cnt: 0,
        review_cnt: 0,
        all_point: 0,
        all_hyoka_cnt: 0,
        sasie_cnt: 0,
        kaiwaritu: 0,
        general_firstup: "",
    });

    // ステータス別の件数（タブのバッジ表示用）
    const statusCounts = useMemo(() => {
        const counts: Record<ReadStatus | "all", number> = { all: favorites.length, unread: 0, reading: 0, finished: 0 };
        for (const fav of favorites) {
            const status = fav.readStatus ?? "unread";
            counts[status] += 1;
        }
        return counts;
    }, [favorites]);

    // フィルター＆ソート適用後のリスト
    const visibleFavorites = useMemo(() => {
        let list = favorites;
        if (statusFilter !== "all") {
            list = list.filter((f) => (f.readStatus ?? "unread") === statusFilter);
        }
        list = [...list];
        switch (sortOrder) {
            case "addedAsc":
                list.sort((a, b) => a.addedAt - b.addedAt);
                break;
            case "updatedDesc":
                list.sort((a, b) => (b.general_lastup || "").localeCompare(a.general_lastup || ""));
                break;
            case "titleAsc":
                list.sort((a, b) => a.title.localeCompare(b.title, "ja"));
                break;
            case "addedDesc":
            default:
                list.sort((a, b) => b.addedAt - a.addedAt);
                break;
        }
        return list;
    }, [favorites, statusFilter, sortOrder]);

    if (!loaded) return null;

    const updatedCount = Object.values(updateInfos).filter((u) => u.hasUpdate).length;

    return (
        <main className="min-h-screen pb-16">
            <div className="max-w-6xl mx-auto px-4 mt-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 flex items-center justify-center" style={{ background: "rgba(138,32,32,0.08)", border: "1px solid rgba(138,32,32,0.20)", borderRadius: "4px" }}>
                        <Heart style={{ color: "#8a2020", width: "20px", height: "20px" }} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold gradient-text">お気に入り</h2>
                        <p className="text-xs text-muted">{favorites.length} 作品を保存中</p>
                    </div>

                    {/* Actions */}
                    {favorites.length > 0 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={checkUpdates}
                                disabled={isChecking}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary/15 text-primary-light hover:bg-primary/25 transition-all disabled:opacity-50"
                                title="お気に入り作品の更新をチェック"
                            >
                                {isChecking ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Bell className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline">更新チェック</span>
                            </button>
                            <button
                                onClick={handleExport}
                                className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-all"
                                title="お気に入りをエクスポート"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleImport}
                                className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-all"
                                title="お気に入りをインポート"
                            >
                                <Upload className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Update check results */}
                {Object.keys(updateInfos).length > 0 && (
                    <div className={`glass rounded-xl p-4 mb-6 ${updatedCount > 0 ? "border-green-500/30" : ""}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {updatedCount > 0 ? (
                                <Bell className="w-4 h-4 text-green-400" />
                            ) : (
                                <BellOff className="w-4 h-4 text-muted" />
                            )}
                            <span className="text-sm font-medium">
                                {updatedCount > 0
                                    ? `${updatedCount}作品に更新があります！`
                                    : "更新はありません"}
                            </span>
                            {lastChecked && (
                                <span className="text-xs text-muted ml-auto">最終チェック: {lastChecked}</span>
                            )}
                        </div>
                        {updatedCount > 0 && (
                            <>
                                <div className="flex justify-end mb-2">
                                    <button
                                        onClick={markAllAsRead}
                                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-muted hover:text-foreground hover:bg-white/10 border border-border transition-all"
                                    >
                                        <Check className="w-3 h-3" />
                                        すべて既読にする
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {Object.values(updateInfos)
                                        .filter((u) => u.hasUpdate)
                                        .map((u) => {
                                            const fav = favorites.find((f) => f.ncode === u.ncode);
                                            return (
                                                <span
                                                    key={u.ncode}
                                                    className="inline-flex items-center gap-1 text-xs pl-3 pr-1.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20"
                                                >
                                                    <a
                                                        href={`https://ncode.syosetu.com/${u.ncode.toLowerCase()}/`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:underline"
                                                    >
                                                        📗 {fav?.title?.slice(0, 20) || u.ncode}
                                                        {(u.newEpisodes ?? 0) > 0 && (
                                                            <span className="ml-1 font-bold">+{u.newEpisodes}話</span>
                                                        )}
                                                    </a>
                                                    <button
                                                        onClick={() => markAsRead(u.ncode)}
                                                        className="ml-1 px-1.5 py-0.5 rounded bg-green-500/10 hover:bg-green-500/25 transition-all"
                                                        title="この作品を既読にする"
                                                    >
                                                        ✓既読
                                                    </button>
                                                </span>
                                            );
                                        })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Empty state */}
                {favorites.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center border border-border">
                            <Heart className="w-10 h-10 text-red-400/50" />
                        </div>
                        <h3 className="text-xl font-bold text-muted mb-2">お気に入りがありません</h3>
                        <p className="text-sm text-muted/60 mb-4">
                            検索結果やランキングから作品をお気に入りに追加しましょう
                        </p>
                        <button
                            onClick={handleImport}
                            className="text-sm text-primary-light hover:underline"
                        >
                            JSONファイルからインポート
                        </button>
                    </div>
                )}

                {/* Status Filter Tabs & Sort */}
                {favorites.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <div className="flex flex-wrap gap-2">
                            {STATUS_TABS.map((tab) => (
                                <button
                                    key={tab.value}
                                    onClick={() => setStatusFilter(tab.value)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${statusFilter === tab.value
                                        ? "text-white"
                                        : "text-muted hover:text-foreground bg-white/5 border border-border"
                                        }`}
                                    style={statusFilter === tab.value ? { background: "#1a2744" } : undefined}
                                >
                                    {tab.label}
                                    <span className="ml-1.5 text-xs opacity-70">
                                        {statusCounts[tab.value]}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                            className="form-input w-auto"
                        >
                            <option value="addedDesc">追加日（新しい順）</option>
                            <option value="addedAsc">追加日（古い順）</option>
                            <option value="updatedDesc">更新日（新しい順）</option>
                            <option value="titleAsc">タイトル順</option>
                        </select>
                    </div>
                )}

                {/* Favorites list */}
                {favorites.length > 0 && (
                    <div className="space-y-4">
                        {visibleFavorites.map((fav) => {
                            const info = updateInfos[fav.ncode];
                            const currentStatus: ReadStatus = fav.readStatus ?? "unread";
                            return (
                                <div key={fav.ncode} className="relative">
                                    {info?.hasUpdate && (
                                        <div className="absolute -top-2 -right-2 z-10 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                                            更新あり{info.newEpisodes && info.newEpisodes > 0 ? ` +${info.newEpisodes}話` : ""}
                                        </div>
                                    )}
                                    {/* ステータス切替セグメントボタン */}
                                    <div className="flex gap-1.5 mb-1.5">
                                        {(
                                            [
                                                { value: "unread" as ReadStatus, label: "積読" },
                                                { value: "reading" as ReadStatus, label: "読書中" },
                                                { value: "finished" as ReadStatus, label: "読了" },
                                            ]
                                        ).map((s) => {
                                            const isActive = currentStatus === s.value;
                                            const activeStyle =
                                                s.value === "unread"
                                                    ? { background: "rgba(120,120,120,0.18)", color: "#9a9a9a", border: "1px solid rgba(120,120,120,0.3)" }
                                                    : s.value === "reading"
                                                        ? { background: "rgba(26,39,68,0.15)", color: "#1a2744", border: "1px solid rgba(26,39,68,0.3)" }
                                                        : { background: "rgba(184,136,58,0.15)", color: "#b8883a", border: "1px solid rgba(184,136,58,0.3)" };
                                            return (
                                                <button
                                                    key={s.value}
                                                    onClick={() => handleStatusChange(fav.ncode, s.value)}
                                                    className="text-xs px-2.5 py-1 rounded-md transition-all"
                                                    style={isActive ? activeStyle : { background: "transparent", color: "#9a9a9a", border: "1px solid rgba(120,120,120,0.2)" }}
                                                >
                                                    {s.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <NovelCard
                                        novel={toNarouNovel(fav)}
                                        onSimilarSearch={handleSimilarSearch}
                                        onAuthorSearch={handleAuthorSearch}
                                        onFavoriteChange={() => setFavorites(getFavorites())}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
