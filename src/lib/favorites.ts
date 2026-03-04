"use client";

import { NarouNovel } from "./narou";

const FAVORITES_KEY = "narou-finder-favorites";

export interface FavoriteNovel {
    ncode: string;
    title: string;
    writer: string;
    genre: number;
    global_point: number;
    fav_novel_cnt: number;
    length: number;
    general_all_no: number;
    novel_type: number;
    end: number;
    story: string;
    keyword: string;
    general_lastup: string;
    isstop: number;
    addedAt: number; // timestamp
}

export function getFavorites(): FavoriteNovel[] {
    if (typeof window === "undefined") return [];
    try {
        const data = localStorage.getItem(FAVORITES_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function addFavorite(novel: NarouNovel): void {
    const favorites = getFavorites();
    if (favorites.some((f) => f.ncode === novel.ncode)) return;
    const fav: FavoriteNovel = {
        ncode: novel.ncode,
        title: novel.title,
        writer: novel.writer,
        genre: novel.genre,
        global_point: novel.global_point,
        fav_novel_cnt: novel.fav_novel_cnt,
        length: novel.length,
        general_all_no: novel.general_all_no,
        novel_type: novel.novel_type,
        end: novel.end,
        story: novel.story,
        keyword: novel.keyword,
        general_lastup: novel.general_lastup,
        isstop: novel.isstop,
        addedAt: Date.now(),
    };
    favorites.unshift(fav);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function removeFavorite(ncode: string): void {
    const favorites = getFavorites().filter((f) => f.ncode !== ncode);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function isFavorite(ncode: string): boolean {
    return getFavorites().some((f) => f.ncode === ncode);
}

export function getFavoriteCount(): number {
    return getFavorites().length;
}
