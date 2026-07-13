"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    BookOpen, Heart, HeartOff, Search, User, Clock,
    Star, Timer, CalendarDays, RefreshCw, ArrowLeft,
} from "lucide-react";
import { GENRE_MAP, type NarouNovel } from "@/lib/narou";
import { addFavorite, removeFavorite, isFavorite } from "@/lib/favorites";
import { addHistory } from "@/lib/history";

// ===== ヘルパー関数（NovelCard のロジックを再実装） =====

// 数値を万単位でフォーマットする
function formatNumber(num: number): string {
    if (num >= 10000) {
        return (num / 10000).toFixed(1).replace(/\.0$/, "") + "万";
    }
    return (num ?? 0).toLocaleString();
}

// "YYYY-MM-DD HH:mm:ss" を "YYYY/MM/DD" に整形する
function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    const datePart = dateStr.split(" ")[0];
    if (!datePart) return "";
    const [year, month, day] = datePart.split("-");
    return `${year}/${parseInt(month, 10).toString().padStart(2, "0")}/${parseInt(day, 10).toString().padStart(2, "0")}`;
}

// 読了目安時間（500字/分）
function formatReadingTime(charCount: number): string {
    const minutes = Math.round(charCount / 500);
    if (minutes < 60) return `約${minutes}分`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `約${hours}時間`;
    return `約${hours}時間${mins}分`;
}

// 1日30分読書ペースでの読了日数
function getReadingPace(charCount: number): string {
    const dailyChars = 500 * 30;
    const days = Math.ceil(charCount / dailyChars);
    if (days <= 1) return "1日で読了";
    return `${days}日で読了`;
}

// 作品ステータス（短編／連載中／完結済）判定と配色
function getNovelStatus(novel: NarouNovel): {
    label: string; color: string; bgColor: string; borderColor: string;
} {
    if (novel.novel_type === 2) {
        return { label: "短編", color: "#1a2744", bgColor: "rgba(26,39,68,0.06)", borderColor: "rgba(26,39,68,0.14)" };
    }
    if (novel.end === 1) {
        return { label: "連載中", color: "#1a5c30", bgColor: "rgba(26,92,48,0.06)", borderColor: "rgba(26,92,48,0.16)" };
    }
    return { label: "完結済", color: "#7a5c1a", bgColor: "rgba(184,136,58,0.08)", borderColor: "rgba(184,136,58,0.20)" };
}

// 更新頻度を算出する
function getUpdateFrequency(novel: NarouNovel): { text: string; color: string } | null {
    if (novel.novel_type === 2 || novel.general_all_no <= 1) return null;
    if (!novel.general_firstup || !novel.general_lastup) return null;
    const firstup = new Date(novel.general_firstup).getTime();
    const lastup = new Date(novel.general_lastup).getTime();
    const totalDays = (lastup - firstup) / (1000 * 60 * 60 * 24);
    if (totalDays <= 0) return null;
    const avgDays = totalDays / (novel.general_all_no - 1);
    if (avgDays < 1.5) return { text: "ほぼ毎日", color: "#1a5c30" };
    if (avgDays < 4) return { text: `約${Math.round(avgDays)}日に1話`, color: "#1a2744" };
    if (avgDays < 8) return { text: "週約1回", color: "#2c4070" };
    if (avgDays < 15) return { text: "月約2回", color: "#7a5c1a" };
    if (avgDays < 35) return { text: "月約1回", color: "#8a4020" };
    return { text: `約${Math.round(avgDays)}日に1話`, color: "#8a2020" };
}

// 類似検索用の具体的タグを抽出する（NovelCard と同じ汎用タグ除外ロジック）
function getSimilarTags(keyword: string): string[] {
    if (!keyword) return [];
    const genericTags = new Set([
        "R15", "残酷な描写あり", "ボーイズラブ", "ガールズラブ",
        "異世界転生", "異世界転移", "異世界", "現代", "男主人公", "女主人公",
        "ハッピーエンド", "バッドエンド", "シリアス", "ほのぼの",
        "ダーク", "ギャグ", "オリジナル戦記", "日常",
    ]);
    const allTags = keyword.split(/\s+/).filter(Boolean);
    const specificTags = allTags.filter((tag) => !genericTags.has(tag));
    return specificTags.length > 0 ? specificTags.slice(0, 4) : allTags.slice(0, 3);
}

// ===== 統計項目の1セル =====
function StatCell({ label, value, unit }: { label: string; value: string; unit?: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted" style={{ letterSpacing: "0.04em" }}>{label}</span>
            <span className="text-lg font-bold num-badge" style={{ color: "#1a2744" }}>
                {value}
                {unit && <span className="text-xs text-muted font-normal ml-0.5">{unit}</span>}
            </span>
        </div>
    );
}

interface NovelDetailProps {
    novel: NarouNovel;
}

export default function NovelDetail({ novel }: NovelDetailProps) {
    const router = useRouter();
    const [isFav, setIsFav] = useState(false);

    const status = getNovelStatus(novel);
    const updateFreq = getUpdateFrequency(novel);
    const tags = novel.keyword ? novel.keyword.split(/\s+/).filter(Boolean) : [];

    // マウント後にお気に入り状態を同期し、閲覧履歴を記録する
    useEffect(() => {
        setIsFav(isFavorite(novel.ncode));
        addHistory(novel);
    }, [novel]);

    const toggleFavorite = () => {
        if (isFav) {
            removeFavorite(novel.ncode);
        } else {
            addFavorite(novel);
        }
        setIsFav(!isFav);
    };

    // 類似作品を検索する
    const handleSimilarSearch = () => {
        const selectedTags = getSimilarTags(novel.keyword);
        if (selectedTags.length === 0) return;
        const params = new URLSearchParams({
            word: selectedTags.join(" "),
            genre: String(novel.genre),
        });
        router.push(`/?${params.toString()}`);
    };

    const readUrl = `https://ncode.syosetu.com/${novel.ncode.toLowerCase()}/`;
    const story = (novel.story || "").replace(/<[^>]*>/g, "");

    return (
        <main className="max-w-4xl mx-auto px-4 mt-6 pb-24" style={{ lineHeight: 1.7 }}>
            {/* 戻り導線 */}
            <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-5"
                style={{ letterSpacing: "0.03em" }}
            >
                <ArrowLeft className="w-4 h-4" />
                検索に戻る
            </Link>

            {/* ヘッダー */}
            <header className="mb-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                        className="tag-chip"
                        style={{ background: status.bgColor, color: status.color, borderColor: status.borderColor }}
                    >
                        {status.label}
                    </span>
                    {novel.isstop === 1 && (
                        <span
                            className="tag-chip"
                            style={{ background: "rgba(138,32,32,0.06)", color: "#8a2020", borderColor: "rgba(138,32,32,0.16)" }}
                        >
                            ⚠ 長期停止中
                        </span>
                    )}
                </div>

                <h1
                    className="text-2xl sm:text-3xl font-bold mb-3"
                    style={{ color: "#1a2744", lineHeight: 1.4, letterSpacing: "0.01em" }}
                >
                    {novel.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                    <Link
                        href={`/?word=${encodeURIComponent(novel.writer)}&wname=1`}
                        className="inline-flex items-center gap-1.5 hover:text-primary-light transition-colors"
                    >
                        <User className="w-4 h-4" />
                        {novel.writer}
                    </Link>
                    <Link
                        href={`/?genre=${novel.genre}`}
                        className="tag-chip hover:opacity-80 transition-opacity"
                    >
                        {GENRE_MAP[novel.genre] || "不明"}
                    </Link>
                </div>
            </header>

            {/* アクション行 */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
                <a
                    href={readUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 px-5 rounded-lg transition-colors"
                    style={{
                        background: "#1a2744",
                        color: "rgba(245,241,234,0.95)",
                        textDecoration: "none",
                        letterSpacing: "0.04em",
                    }}
                >
                    <BookOpen className="w-4 h-4" />
                    なろうで読む
                </a>

                <button
                    onClick={toggleFavorite}
                    className="inline-flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                    style={{
                        background: isFav ? "rgba(184,72,72,0.08)" : "rgba(26,39,68,0.05)",
                        color: isFav ? "#a83232" : "#1a2744",
                        border: `1px solid ${isFav ? "rgba(184,72,72,0.20)" : "rgba(26,39,68,0.12)"}`,
                        cursor: "pointer",
                    }}
                    title={isFav ? "お気に入り解除" : "お気に入り追加"}
                >
                    {isFav ? (
                        <Heart className="w-4 h-4 fill-current" />
                    ) : (
                        <HeartOff className="w-4 h-4" />
                    )}
                    {isFav ? "お気に入り済" : "お気に入り"}
                </button>

                {novel.keyword && getSimilarTags(novel.keyword).length > 0 && (
                    <button
                        onClick={handleSimilarSearch}
                        className="inline-flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                        style={{
                            background: "rgba(26,39,68,0.05)",
                            color: "#1a2744",
                            border: "1px solid rgba(26,39,68,0.12)",
                            cursor: "pointer",
                        }}
                    >
                        <Search className="w-4 h-4" />
                        類似作品を検索
                    </button>
                )}
            </div>

            {/* 統計グリッド */}
            <section className="glass rounded-2xl p-5 sm:p-6 mb-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-5">
                    <StatCell label="総合ポイント" value={formatNumber(novel.global_point)} unit="pt" />
                    <StatCell label="ブックマーク" value={formatNumber(novel.fav_novel_cnt)} />
                    <StatCell label="評価数" value={formatNumber(novel.all_hyoka_cnt || 0)} />
                    <StatCell label="評価点" value={formatNumber(novel.all_point || 0)} unit="pt" />
                    <StatCell label="感想数" value={formatNumber(novel.impression_cnt || 0)} />
                    <StatCell label="レビュー数" value={formatNumber(novel.review_cnt || 0)} />
                    <StatCell label="文字数" value={formatNumber(novel.length)} unit="字" />
                    <StatCell label="話数" value={(novel.general_all_no ?? 0).toLocaleString()} unit="話" />
                    <StatCell label="会話率" value={String(novel.kaiwaritu ?? 0)} unit="%" />
                    <StatCell label="挿絵数" value={(novel.sasie_cnt ?? 0).toLocaleString()} unit="枚" />
                </div>
            </section>

            {/* 読書情報 */}
            <section className="glass rounded-2xl p-5 sm:p-6 mb-6">
                <div className="flex flex-wrap gap-2">
                    <span
                        className="tag-chip inline-flex items-center gap-1"
                        style={{ padding: "5px 11px", fontSize: "12px" }}
                    >
                        <Timer className="w-3.5 h-3.5" />
                        読了目安 {formatReadingTime(novel.length)}
                    </span>
                    {novel.length >= 30000 && (
                        <span
                            className="tag-chip inline-flex items-center gap-1"
                            style={{ padding: "5px 11px", fontSize: "12px" }}
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            1日30分で {getReadingPace(novel.length)}
                        </span>
                    )}
                    {updateFreq && (
                        <span
                            className="tag-chip inline-flex items-center gap-1"
                            style={{
                                background: `${updateFreq.color}15`,
                                color: updateFreq.color,
                                borderColor: `${updateFreq.color}30`,
                                padding: "5px 11px",
                                fontSize: "12px",
                            }}
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            更新頻度 {updateFreq.text}
                        </span>
                    )}
                    <span
                        className="tag-chip inline-flex items-center gap-1"
                        style={{ padding: "5px 11px", fontSize: "12px" }}
                    >
                        <Star className="w-3.5 h-3.5" />
                        初回掲載 {formatDate(novel.general_firstup)}
                    </span>
                    <span
                        className="tag-chip inline-flex items-center gap-1"
                        style={{ padding: "5px 11px", fontSize: "12px" }}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        最終更新 {formatDate(novel.general_lastup)}
                    </span>
                </div>
            </section>

            {/* あらすじ全文 */}
            <section className="mb-8">
                <h2
                    className="text-lg font-bold mb-3 pb-2"
                    style={{ color: "#1a2744", borderBottom: "1px solid rgba(24,21,15,0.10)", letterSpacing: "0.02em" }}
                >
                    あらすじ
                </h2>
                <p
                    className="text-foreground/85 whitespace-pre-line"
                    style={{ lineHeight: 1.8, maxWidth: "42rem", letterSpacing: "0.02em" }}
                >
                    {story}
                </p>
            </section>

            {/* タグ一覧 */}
            {tags.length > 0 && (
                <section className="mb-8">
                    <h2
                        className="text-lg font-bold mb-3 pb-2"
                        style={{ color: "#1a2744", borderBottom: "1px solid rgba(24,21,15,0.10)", letterSpacing: "0.02em" }}
                    >
                        タグ
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag, i) => (
                            <Link
                                key={i}
                                href={`/?word=${encodeURIComponent(tag)}`}
                                className="tag-chip hover:opacity-80 transition-opacity"
                                style={{ padding: "4px 10px", fontSize: "12px" }}
                            >
                                #{tag}
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
