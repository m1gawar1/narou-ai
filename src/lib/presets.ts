"use client";

const PRESETS_KEY = "narou-finder-presets";

export interface SearchPreset {
    id: string;
    name: string;
    keyword: string;
    tagKeyword: string;
    notKeyword: string;
    genre: string;
    order: string;
    minLen: string;
    maxLen: string;
    novelType: string;
    createdAt: number;
}

export function getPresets(): SearchPreset[] {
    if (typeof window === "undefined") return [];
    try {
        const data = localStorage.getItem(PRESETS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function savePreset(preset: Omit<SearchPreset, "id" | "createdAt">): SearchPreset {
    const presets = getPresets();
    const newPreset: SearchPreset = {
        ...preset,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        createdAt: Date.now(),
    };
    presets.unshift(newPreset);
    // 最大10件
    if (presets.length > 10) presets.pop();
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    return newPreset;
}

export function deletePreset(id: string): void {
    const presets = getPresets().filter((p) => p.id !== id);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}
