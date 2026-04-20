"use client";

import { useState, useEffect } from "react";
import {
    ExternalLink, BookOpen, Star, Heart, HeartOff,
    BookMarked, Clock, Tag, Radar, Search,
    Timer, RefreshCw, CalendarDays, User, ChevronDown, ChevronUp
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
    const datePart = dateStr.split(" ")[0];
    if (!datePart) return "";
    const [year, month, day] = datePart.split("-");
    return `${year}/${parseInt(month, 10).toString().padStart(2, "0")}/${parseInt(day, 10).toString().padStart(2, "0")}`;
}

function formatReadingTime(charCount: number): string {
    const minutes = Math.round(charCount / 500);
    if (minutes < 60) return `約${minutes}分`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `約${hours}時間`;
    return `約${hours}時間${mins}分`;
}

function getReadingTimeColor(charCount: number): { bg: string; text: string; border: string } {
    const minutes = Math.round(charCount / 500);
    if (minutes <= 30)  return { bg: "rgba(26,39,68,0.06)",   text: "#1a2744", border: "rgba(26,39,68,0.14)" };
    if (minutes <= 180) return { bg: "rgba(26,39,68,0.06)",   text: "#2c4070", border: "rgba(26,39,68,0.14)" };
    if (minutes <= 600) return { bg: "rgba(184,136,58,0.08)", text: "#7a5c1a", border: "rgba(184,136,58,0.20)" };
    return                     { bg: "rgba(184,136,58,0.10)", text: "#6a4c10", border: "rgba(184,136,58,0.22)" };
}

function getNovelStatus(novel: NarouNovel | { novel_type: number; end: number; isstop?: number }): {
    label: string; color: string; bgColor: string; borderColor: string;
} {
    if (novel.novel_type === 2) {
        return { label: "短編",  color: "#1a2744", bgColor: "rgba(26,39,68,0.06)",  borderColor: "rgba(26,39,68,0.14)" };
    }
    if (novel.end === 1) {
        return { label: "連載中", color: "#1a5c30", bgColor: "rgba(26,92,48,0.06)",  borderColor: "rgba(26,92,48,0.16)" };
    }
    return { label: "完結済", color: "#7a5c1a", bgColor: "rgba(184,136,58,0.08)", borderColor: "rgba(184,136,58,0.20)" };
}

function getUpdateFrequency(novel: NarouNovel): { text: string; color: string } | null {
    if (novel.novel_type === 2 || novel.general_all_no <= 1) return null;
    if (!novel.general_firstup || !novel.general_lastup) return null;
    const firstup = new Date(novel.general_firstup).getTime();
    const lastup = new Date(novel.general_lastup).getTime();
    const totalDays = (lastup - firstup) / (1000 * 60 * 60 * 24);
    if (totalDays <= 0) return null;
    const avgDays = totalDays / (novel.general_all_no - 1);
    if (avgDays < 1.5) return { text: "ほぼ毎日",              color: "#1a5c30" };
    if (avgDays < 4)   return { text: `約${Math.round(avgDays)}日に1話`, color: "#1a2744" };
    if (avgDays < 8)   return { text: "週約1回",               color: "#2c4070" };
    if (avgDays < 15)  return { text: "月約2回",               color: "#7a5c1a" };
    if (avgDays < 35)  return { text: "月約1回",               color: "#8a4020" };
    return                    { text: `約${Math.round(avgDays)}日に1話`, color: "#8a2020" };
}

function getReadingPace(charCount: number): string {
    const dailyChars = 500 * 30;
    const days = Math.ceil(charCount / dailyChars);
    if (days <= 1) return "1日で読了";
    return `${days}日で読了`;
}

function RadarChart({ values, labels }: { values: number[]; labels: string[] }) {
    const size = 260;
    const center = size / 2;
    const maxRadius = 70;
    const sides = values.length;
    const angleStep = (Math.PI * 2) / sides;

    const getPoint = (index: number, value: number) => {
        const angle = angleStep * index - Math.PI / 2;
        const r = maxRadius * value;
        return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
    };

    const gridLevels = [0.25, 0.5, 0.75, 1];

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px] mx-auto">
            {gridLevels.map((level) => (
                <polygon
                    key={level}
                    points={Array.from({ length: sides }, (_, i) => {
                        const p = getPoint(i, level);
                        return `${p.x},${p.y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="rgba(26, 39, 68, 0.12)"
                    strokeWidth="1"
                />
            ))}
            {Array.from({ length: sides }, (_, i) => {
                const p = getPoint(i, 1);
                return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(26, 39, 68, 0.08)" strokeWidth="1" />;
            })}
            <polygon
                points={values.map((v, i) => { const p = getPoint(i, v); return `${p.x},${p.y}`; }).join(" ")}
                fill="rgba(26, 39, 68, 0.10)"
                stroke="#1a2744"
                strokeWidth="2"
            />
            {values.map((v, i) => {
                const p = getPoint(i, v);
                return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#b8883a" />;
            })}
            {labels.map((label, i) => {
                const p = getPoint(i, 1.5);
                return (
                    <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize="13" fontWeight="500">
                        {label}
                    </text>
                );
            })}
        </svg>
    );
}

function normalizeLog(value: number, max: number): number {
    if (value <= 0) return 0;
    return Math.min(Math.log10(value + 1) / Math.log10(max + 1), 1);
}

interface NovelCardProps {
    novel: NarouNovel;
    rank?: number;
    onSimilarSearch?: (keywords: string, genre: number, title: string) => void;
    onAuthorSearch?: (authorName: string) => void;
    onKeywordClick?: (keyword: string) => void;
    showRank?: boolean;
}

export default function NovelCard({ novel, rank, onSimilarSearch, onAuthorSearch, onKeywordClick, showRank }: NovelCardProps) {
    const [isFav, setIsFav] = useState(false);
    const [showScore, setShowScore] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const novelStatus = getNovelStatus(novel);
    const readingTimeColor = getReadingTimeColor(novel.length);
    const updateFreq = getUpdateFrequency(novel);
    const readingPace = getReadingPace(novel.length);

    useEffect(() => {
        setIsFav(isFavorite(novel.ncode));
    }, [novel.ncode]);

    const toggleFavorite = () => {
        if (isFav) { removeFavorite(novel.ncode); } else { addFavorite(novel); }
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
        <div className="novel-card glass rounded-2xl p-4 sm:p-5">
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
                            style={{ fontFamily: "'Noto Sans JP', sans-serif", letterSpacing: "0.01em" }}
                        >
                            <span className="line-clamp-2 sm:line-clamp-1">{novel.title}</span>
                            <ExternalLink className="w-4 h-4 opacity-50 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                        </a>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={() => setShowScore(!showScore)}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ background: showScore ? "rgba(0,119,237,0.10)" : "transparent" }}
                                title="スコアカード"
                            >
                                <Radar className="w-4 h-4" style={{ color: showScore ? "#0077ed" : "#8e8e93" }} />
                            </button>
                            <button
                                onClick={toggleFavorite}
                                className="p-1.5 rounded-lg transition-colors"
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
                    {/* Compact meta: author + genre + status only */}
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
                    </div>
                </div>
            </div>

            {/* Story excerpt — line-clamp-2 */}
            <p className="text-sm text-foreground/70 leading-relaxed line-clamp-2 mb-4">
                {novel.story?.replace(/<[^>]*>/g, "")}
            </p>

            {/* Score Card */}
            <AnimatePresence>
                {showScore && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mb-4"
                    >
                        <div className="p-4" style={{ background: "rgba(26,39,68,0.03)", border: "1px solid rgba(26,39,68,0.08)", borderRadius: "4px" }}>
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs mb-3">
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
            </div>

            {/* Expand toggle */}
            <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: "#7a7369", background: "none", border: "none", cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif", letterSpacing: "0.02em", padding: "2px 0" }}
            >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expanded ? "詳細を閉じる" : "詳細を見る"}
            </button>

            {/* Expanded detail section */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(24,21,15,0.07)" }}>
                            {/* Extra badges */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                <span
                                    className="tag-chip flex items-center gap-1"
                                    style={{ background: readingTimeColor.bg, color: readingTimeColor.text, borderColor: readingTimeColor.border }}
                                    title={`${novel.length.toLocaleString()}字 ÷ 500字/分`}
                                >
                                    <Timer className="w-3 h-3" />
                                    {formatReadingTime(novel.length)}
                                </span>
                                {novel.length >= 30000 && (
                                    <span
                                        className="tag-chip flex items-center gap-1"
                                        style={{ background: "rgba(26,39,68,0.05)", color: "#1a2744", borderColor: "rgba(26,39,68,0.13)" }}
                                        title="1日30分読書での見積り"
                                    >
                                        <CalendarDays className="w-3 h-3" />
                                        {readingPace}
                                    </span>
                                )}
                                {updateFreq && novel.end === 1 && (
                                    <span
                                        className="tag-chip flex items-center gap-1"
                                        style={{ background: `${updateFreq.color}15`, color: updateFreq.color, borderColor: `${updateFreq.color}30` }}
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        {updateFreq.text}
                                    </span>
                                )}
                                {novel.isstop === 1 && (
                                    <span className="tag-chip" style={{ background: "rgba(138,32,32,0.06)", color: "#8a2020", borderColor: "rgba(138,32,32,0.16)" }}>
                                        ⚠ 長期停止中
                                    </span>
                                )}
                            </div>

                            {/* Keyword tags — clickable, up to 8 */}
                            {novel.keyword && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {novel.keyword.split(/\s+/).filter(Boolean).slice(0, 8).map((kw, i) => (
                                        <button
                                            key={i}
                                            onClick={() => onKeywordClick?.(kw)}
                                            className="text-[10px] px-2 py-0.5 rounded-full transition-colors"
                                            style={{
                                                background: "rgba(26,39,68,0.05)",
                                                color: "#4a5c84",
                                                border: "1px solid rgba(26,39,68,0.10)",
                                                cursor: onKeywordClick ? "pointer" : "default",
                                                fontFamily: "'Noto Sans JP', sans-serif",
                                            }}
                                            title={onKeywordClick ? `「${kw}」で検索` : undefined}
                                        >
                                            #{kw}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2">
                                <a
                                    href={`https://ncode.syosetu.com/${novel.ncode.toLowerCase()}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors"
                                    style={{
                                        background: "#1a2744",
                                        color: "rgba(245,241,234,0.95)",
                                        textDecoration: "none",
                                        letterSpacing: "0.04em",
                                    }}
                                >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    作品を読む
                                </a>
                                {onSimilarSearch && novel.keyword && (
                                    <button
                                        onClick={handleSimilarSearch}
                                        className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg transition-colors"
                                        style={{
                                            background: "rgba(26,39,68,0.06)",
                                            color: "#1a2744",
                                            border: "1px solid rgba(26,39,68,0.12)",
                                            cursor: "pointer",
                                            fontFamily: "'Noto Sans JP', sans-serif",
                                        }}
                                    >
                                        <Search className="w-3.5 h-3.5" />
                                        類似作品
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
