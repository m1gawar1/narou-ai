import { fetchNarouNovels, type SearchParams } from "@/lib/narou";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const period = searchParams.get("period") || "weekly";
    const genre = searchParams.get("genre");
    const word = searchParams.get("word");
    const notword = searchParams.get("notword");
    const lim = searchParams.get("lim");

    // 期間別のorderマッピング
    const orderMap: Record<string, string> = {
        daily: "dailypoint",
        weekly: "weeklypoint",
        monthly: "monthlypoint",
        quarter: "quarterpoint",
        yearly: "yearlypoint",
    };

    const params: SearchParams = {
        order: orderMap[period] || "weeklypoint",
        lim: lim ? Number(lim) : 20,
    };

    if (genre) params.genre = Number(genre);
    if (word) params.word = word;
    if (notword) params.notword = notword;

    const st = searchParams.get("st");
    if (st) params.st = Number(st);

    try {
        const result = await fetchNarouNovels(params);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Ranking API error:", error);
        return NextResponse.json(
            { error: "ランキングの取得に失敗しました" },
            { status: 500 }
        );
    }
}
