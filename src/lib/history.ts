"use client";

import { NarouNovel } from "./narou";

const HISTORY_KEY = "narou-finder-history";
const MAX_HISTORY = 50;

// 閲覧履歴の1エントリ（表示に必要な最小限のフィールドのみ保持）
export interface HistoryEntry {
    ncode: string;
    title: string;
    writer: string;
    genre: number;
    novel_type: number;
    end: number;
    length: number;
    global_point: number;
    viewedAt: number; // timestamp
}

export function getHistory(): HistoryEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const data = localStorage.getItem(HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

// 閲覧を記録する（同一作品は先頭に移動、最大 MAX_HISTORY 件）
export function addHistory(novel: NarouNovel): void {
    if (typeof window === "undefined") return;
    const entry: HistoryEntry = {
        ncode: novel.ncode,
        title: novel.title,
        writer: novel.writer,
        genre: novel.genre,
        novel_type: novel.novel_type,
        end: novel.end,
        length: novel.length,
        global_point: novel.global_point,
        viewedAt: Date.now(),
    };
    const history = getHistory().filter((h) => h.ncode !== entry.ncode);
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function removeHistory(ncode: string): void {
    const history = getHistory().filter((h) => h.ncode !== ncode);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(HISTORY_KEY);
}
