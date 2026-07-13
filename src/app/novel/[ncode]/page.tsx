import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchNarouNovels } from "@/lib/narou";
import NovelDetail from "@/components/NovelDetail";

// HTMLタグを除去してプレーンテキストにする
function stripHtml(html: string): string {
    return (html || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// Next.js 16 では params は Promise
export async function generateMetadata({
    params,
}: {
    params: Promise<{ ncode: string }>;
}): Promise<Metadata> {
    const { ncode } = await params;
    try {
        const { novels } = await fetchNarouNovels({ ncode, lim: 1 });
        const novel = novels[0];
        if (!novel) {
            return { title: "作品が見つかりません | なろう小説ファインダー" };
        }
        const desc = stripHtml(novel.story).slice(0, 120);
        return {
            title: `${novel.title} | なろう小説ファインダー`,
            description: desc,
        };
    } catch {
        // メタデータ生成中の throw を避け、汎用タイトルにフォールバック
        return { title: "作品詳細 | なろう小説ファインダー" };
    }
}

export default async function Page({
    params,
}: {
    params: Promise<{ ncode: string }>;
}) {
    const { ncode } = await params;
    const { novels } = await fetchNarouNovels({ ncode, lim: 1 });
    if (novels.length === 0) {
        notFound();
    }
    return <NovelDetail novel={novels[0]} />;
}
