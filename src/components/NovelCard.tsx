"use client";

import { useState, useEffect } from "react";
import {
    ExternalLink, BookOpen, Star, Heart, HeartOff,
    BookMarked, Clock, Tag, Radar, ChevronDown, ChevronUp, Search,
    Timer, CheckSquare, Square, RefreshCw, CalendarDays, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GENRE_MAP, type NarouNovel } from "@/lib/narou";
import { addFavorite, removeFavorite, isFavorite } from "@/lib/favorites";

function formatNumber(num: number): string {
    if (num >= 10000) {
        return (num / 10000).toFixed(1).replace(/\.0$/, "") + "万";
    }
    return num.toLocaleString();
}

function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    // APIから "2023-01-01 12:34:56" のような形式で来るので、日付部分だけ取り出して / に置換
    const datePart = dateStr.split(" ")[0];
    if (!datePart) return "";
    const [year, month, day] = datePart.split("-");
    return `${year}/${parseInt(month, 10).toString().padStart(2, "0")}/${parseInt(day, 10).toString().padStart(2, "0")}`;
}

function formatReadingTime(charCount: number): string {
    const minutes = Math.round(charCount / 500); // 日本語平均読速 500字/分
    if (minutes < 60) return `約${minutes}分`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `約${hours}時間`;
    return `約${hours}時間${mins}分`;
}

function getReadingTimeColor(charCount: number): { bg: string; text: string; border: string } {
    const minutes = Math.round(charCount / 500);
    if (minutes <= 30) return { bg: "rgba(52, 211, 153, 0.1)", text: "#34d399", border: "rgba(52, 211, 153, 0.2)" };
    if (minutes <= 180) return { bg: "rgba(96, 165, 250, 0.1)", text: "#60a5fa", border: "rgba(96, 165, 250, 0.2)" };
    if (minutes <= 600) return { bg: "rgba(167, 139, 250, 0.1)", text: "#a78bfa", border: "rgba(167, 139, 250, 0.2)" };
    return { bg: "rgba(251, 191, 36, 0.1)", text: "#fbbf24", border: "rgba(251, 191, 36, 0.2)" };
}

function getNovelStatus(novel: NarouNovel | { novel_type: number; end: number; isstop?: number }): {
    label: string; color: string; bgColor: string; borderColor: string;
} {
    if (novel.novel_type === 2) {
        return { label: "短編", color: "#60a5fa", bgColor: "rgba(96, 165, 250, 0.1)", borderColor: "rgba(96, 165, 250, 0.2)" };
    }
    if (novel.end === 1) {
        return { label: "連載中", color: "#34d399", bgColor: "rgba(52, 211, 153, 0.1)", borderColor: "rgba(52, 211, 153, 0.2)" };
    }
    return { label: "完結済", color: "#fbbf24", bgColor: "rgba(251, 191, 36, 0.1)", borderColor: "rgba(251, 191, 36, 0.2)" };
}

// 更新頻度計算
function getUpdateFrequency(novel: NarouNovel): { text: string; color: string } | null {
    if (novel.novel_type === 2 || novel.general_all_no <= 1) return null; // 短編 or 1話
    if (!novel.general_firstup || !novel.general_lastup) return null;
    const firstup = new Date(novel.general_firstup).getTime();
    const lastup = new Date(novel.general_lastup).getTime();
    const totalDays = (lastup - firstup) / (1000 * 60 * 60 * 24);
    if (totalDays <= 0) return null;
    const avgDays = totalDays / (novel.general_all_no - 1);
    if (avgDays < 1.5) return { text: "ほぼ毎日", color: "#34d399" };
    if (avgDays < 4) return { text: `約${Math.round(avgDays)}日に1話`, color: "#60a5fa" };
    if (avgDays < 8) return { text: "週約1回", color: "#a78bfa" };
    if (avgDays < 15) return { text: "月約2回", color: "#fbbf24" };
    if (avgDays < 35) return { text: "月約1回", color: "#fb923c" };
    return { text: `約${Math.round(avgDays)}日に1話`, color: "#f87171" };
}

// 読書ペース計算（1日30分で何日か）
function getReadingPace(charCount: number): string {
    const dailyChars = 500 * 30; // 500字/分 × 30分 = 15000字/日
    const days = Math.ceil(charCount / dailyChars);
    if (days <= 1) return "1日で読了";
    return `${days}日で読了`;
}

// SVGレーダーチャート
function RadarChart({ values, labels }: { values: number[]; labels: string[] }) {
    const size = 260;
    const center = size / 2;
    const maxRadius = 70;
    const sides = values.length;
    const angleStep = (Math.PI * 2) / sides;

    const getPoint = (index: number, value: number) => {
        const angle = angleStep * index - Math.PI / 2;
        const r = maxRadius * value;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
        };
    };

    const gridLevels = [0.25, 0.5, 0.75, 1];

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px] mx-auto">
            {/* Grid */}
            {gridLevels.map((level) => (
                <polygon
                    key={level}
                    points={Array.from({ length: sides }, (_, i) => {
                        const p = getPoint(i, level);
                        return `${p.x},${p.y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.15)"
                    strokeWidth="1"
                />
            ))}
            {/* Axis lines */}
            {Array.from({ length: sides }, (_, i) => {
                const p = getPoint(i, 1);
                return (
                    <line
                        key={i}
                        x1={center}
                        y1={center}
                        x2={p.x}
                        y2={p.y}
                        stroke="rgba(99, 102, 241, 0.1)"
                        strokeWidth="1"
                    />
                );
            })}
            {/* Data polygon */}
            <polygon
                points={values.map((v, i) => {
                    const p = getPoint(i, v);
                    return `${p.x},${p.y}`;
                }).join(" ")}
                fill="rgba(99, 102, 241, 0.2)"
                stroke="#6366f1"
                strokeWidth="2"
            />
            {/* Data points */}
            {values.map((v, i) => {
                const p = getPoint(i, v);
                return (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#818cf8" />
                );
            })}
            {/* Labels */}
            {labels.map((label, i) => {
                const p = getPoint(i, 1.5);
                return (
                    <text
                        key={i}
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#9ca3af"
                        fontSize="13"
                        fontWeight="500"
                    >
                        {label}
                    </text>
                );
            })}
        </svg>
    );
}

// ノーマライズ関数（対数スケール）
function normalizeLog(value: number, max: number): number {
    if (value <= 0) return 0;
    return Math.min(Math.log10(value + 1) / Math.log10(max + 1), 1);
}

interface NovelCardProps {
    novel: NarouNovel;
    rank?: number;
    onSimilarSearch?: (keywords: string, genre: number, title: string) => void;
    onAuthorSearch?: (authorName: string) => void;
    showRank?: boolean;
}

export default function NovelCard({ novel, rank, onSimilarSearch, onAuthorSearch, showRank }: NovelCardProps) {
    const [isFav, setIsFav] = useState(false);
    const [showScore, setShowScore] = useState(false);
    const novelStatus = getNovelStatus(novel);
    const readingTimeColor = getReadingTimeColor(novel.length);
    const updateFreq = getUpdateFrequency(novel);
    const readingPace = getReadingPace(novel.length);

    useEffect(() => {
        setIsFav(isFavorite(novel.ncode));
    }, [novel.ncode]);

    const toggleFavorite = () => {
        if (isFav) {
            removeFavorite(novel.ncode);
        } else {
            addFavorite(novel);
        }
        setIsFav(!isFav);
    };

    const handleSimilarSearch = () => {
        if (!onSimilarSearch || !novel.keyword) return;
        const genericTags = new Set([
            "R15", "残酷な描写あり", "ボーイズラブ", "ガールズラブ",
            "異世界転生", "異世界転移", "異世界", "現代", "男主人公", "女主人公",
            "ハッピーエンド", "バッドエンド", "シリアス", "ほのぼの",
            "ダーク", "ギャグ", "オリジナル戦記", "日常",
        ]);
        const allTags = novel.keyword.split(/\s+/);
        const specificTags = allTags.filter(tag => !genericTags.has(tag));
        const selectedTags = specificTags.length > 0 ? specificTags.slice(0, 4) : allTags.slice(0, 3);
        onSimilarSearch(selectedTags.join(" "), novel.genre, novel.title);
    };

    // スコアカードの値を計算
    const scoreValues = [
        normalizeLog(novel.global_point, 1000000),
        normalizeLog(novel.fav_novel_cnt, 500000),
        normalizeLog(novel.length, 5000000),
        normalizeLog(novel.general_all_no, 3000),
        normalizeLog(novel.all_hyoka_cnt || 0, 50000),
    ];
    const scoreLabels = ["ポイント", "ブクマ", "文字数", "話数", "評価数"];

    const rankBadge = showRank && rank !== undefined ? (
        rank <= 3 ? (
            <span className={`rank-badge rank-${rank}`}>
                {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
            </span>
        ) : (
            <span className="rank-badge rank-other">{rank}</span>
        )
    ) : null;

    return (
        <div className="novel-card glass rounded-xl p-4 sm:p-5 md:p-6">
            {/* Title & Meta */}
            <div className="flex items-start gap-3 mb-3">
                {rankBadge}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <a
                            href={`https://ncode.syosetu.com/${novel.ncode.toLowerCase()}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base sm:text-lg font-bold hover:text-primary-light transition-colors inline-flex items-start gap-2 group"
                        >
                            <span className="line-clamp-2 sm:line-clamp-1">{novel.title}</span>
                            <ExternalLink className="w-4 h-4 opacity-50 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                        </a>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={() => setShowScore(!showScore)}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                title="スコアカード"
                            >
                                <Radar className="w-4 h-4 text-muted hover:text-primary" />
                            </button>
                            <button
                                onClick={toggleFavorite}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                title={isFav ? "お気に入り解除" : "お気に入り追加"}
                            >
                                {isFav ? (
                                    <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                                ) : (
                                    <HeartOff className="w-4 h-4 text-muted hover:text-red-400" />
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted">
                        <button
                            onClick={() => onAuthorSearch?.(novel.writer)}
                            className={`flex items-center gap-1 hover:text-primary-light transition-colors ${onAuthorSearch ? 'cursor-pointer' : ''}`}
                            title={onAuthorSearch ? `${novel.writer}の他の作品を検索` : undefined}
                        >
                            <User className="w-3 h-3" />
                            {novel.writer}
                        </button>
                        <span className="text-border">|</span>
                        <span className="tag-chip">{GENRE_MAP[novel.genre] || "不明"}</span>
                        <span
                            className="tag-chip"
                            style={{ background: novelStatus.bgColor, color: novelStatus.color, borderColor: novelStatus.borderColor }}
                        >
                            {novelStatus.label}
                        </span>
                        {/* 読了時間バッジ */}
                        <span
                            className="tag-chip flex items-center gap-1"
                            style={{ background: readingTimeColor.bg, color: readingTimeColor.text, borderColor: readingTimeColor.border }}
                            title={`${novel.length.toLocaleString()}字 ÷ 500字/分 | 1日30分で${readingPace}`}
                        >
                            <Timer className="w-3 h-3" />
                            {formatReadingTime(novel.length)}
                        </span>
                        {/* 更新頻度バッジ */}
                        {updateFreq && novel.end === 1 && (
                            <span
                                className="tag-chip flex items-center gap-1"
                                style={{ background: `${updateFreq.color}15`, color: updateFreq.color, borderColor: `${updateFreq.color}30` }}
                                title={`平均更新間隔: ${updateFreq.text}`}
                            >
                                <RefreshCw className="w-3 h-3" />
                                {updateFreq.text}
                            </span>
                        )}
                        {/* 読書ペース */}
                        {novel.length >= 30000 && (
                            <span
                                className="tag-chip flex items-center gap-1"
                                style={{ background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.2)" }}
                                title="1日30分読書での見積り"
                            >
                                <CalendarDays className="w-3 h-3" />
                                {readingPace}
                            </span>
                        )}
                        {novel.isstop === 1 && (
                            <span className="tag-chip" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.2)" }}>
                                長期停止中
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Story excerpt */}
            <p className="text-sm text-foreground/70 leading-relaxed line-clamp-3 mb-4">
                {novel.story?.replace(/<[^>]*>/g, "")}
            </p>

            {/* Score Card (expandable) */}
            <AnimatePresence>
                {showScore && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mb-4"
                    >
                        <div className="bg-white/3 rounded-xl p-4 border border-border">
                            <h4 className="text-xs font-semibold text-muted mb-3 text-center">📈 作品スコアカード</h4>
                            <RadarChart values={scoreValues} labels={scoreLabels} />
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3 text-center">
                                {scoreLabels.map((label, i) => (
                                    <div key={label}>
                                        <div className="text-[10px] text-muted">{label}</div>
                                        <div className="text-xs font-semibold num-badge">
                                            {label === "ポイント" ? formatNumber(novel.global_point) :
                                                label === "ブクマ" ? formatNumber(novel.fav_novel_cnt) :
                                                    label === "文字数" ? formatNumber(novel.length) :
                                                        label === "話数" ? novel.general_all_no.toLocaleString() :
                                                            formatNumber(novel.all_hyoka_cnt || 0)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <div className="flex items-center gap-1.5 num-badge" title="総合ポイント">
                    <Star className="w-3.5 h-3.5 text-warning" />
                    <span className="text-foreground font-medium">{formatNumber(novel.global_point)}</span>
                    <span className="text-muted">pt</span>
                </div>
                <div className="flex items-center gap-1.5 num-badge" title="ブックマーク数">
                    <Heart className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-foreground font-medium">{formatNumber(novel.fav_novel_cnt)}</span>
                </div>
                <div className="flex items-center gap-1.5 num-badge" title="文字数">
                    <BookOpen className="w-3.5 h-3.5 text-primary-light" />
                    <span className="text-foreground font-medium">{formatNumber(novel.length)}</span>
                    <span className="text-muted">字</span>
                </div>
                <div className="flex items-center gap-1.5 num-badge" title="全話数">
                    <BookMarked className="w-3.5 h-3.5 text-accent" />
                    <span className="text-foreground font-medium">{novel.general_all_no}</span>
                    <span className="text-muted">話</span>
                </div>
                <div className="flex items-center gap-1.5" title="最終更新">
                    <Clock className="w-3.5 h-3.5 text-muted" />
                    <span className="text-muted">{formatDate(novel.general_lastup)}</span>
                </div>

                {/* Similar search & keyword tags */}
                <div className="w-full sm:w-auto flex flex-wrap items-center gap-1 sm:ml-auto">
                    {onSimilarSearch && novel.keyword && (
                        <button
                            onClick={handleSimilarSearch}
                            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary-light border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                            title="類似作品を検索"
                        >
                            <Search className="w-3 h-3" />
                            類似検索
                        </button>
                    )}
                    {novel.keyword && (
                        <div className="hidden md:flex flex-wrap gap-1">
                            {novel.keyword.split(/\s+/).slice(0, 4).map((kw, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted">
                                    {kw}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
