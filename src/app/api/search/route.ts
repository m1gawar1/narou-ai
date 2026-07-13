import { fetchNarouNovels, type SearchParams } from "@/lib/narou";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const params: SearchParams = {};

    const word = searchParams.get("word");
    if (word) params.word = word;

    const ncode = searchParams.get("ncode");
    if (ncode) params.ncode = ncode;

    const notword = searchParams.get("notword");
    if (notword) params.notword = notword;

    const genre = searchParams.get("genre");
    if (genre) params.genre = Number(genre);

    const biggenre = searchParams.get("biggenre");
    if (biggenre) params.biggenre = Number(biggenre);

    const order = searchParams.get("order");
    if (order) params.order = order;

    // 作品タイプ（連載状態フィルター）: type パラメータを使用
    const type = searchParams.get("type");
    if (type) params.type = type as SearchParams["type"];

    const minlen = searchParams.get("minlen");
    if (minlen) params.minlen = Number(minlen);

    const maxlen = searchParams.get("maxlen");
    if (maxlen) params.maxlen = Number(maxlen);

    const stop = searchParams.get("stop");
    if (stop) params.stop = Number(stop) as 1 | 2;

    const lastup = searchParams.get("lastup");
    if (lastup) params.lastup = lastup;

    const lim = searchParams.get("lim");
    params.lim = lim ? Number(lim) : 20;

    const st = searchParams.get("st");
    if (st) params.st = Number(st);

    // 検索対象制御
    const searchTitle = searchParams.get("title");
    if (searchTitle === "1") params.title = 1;

    const searchEx = searchParams.get("ex");
    if (searchEx === "1") params.ex = 1;

    const searchKeyword = searchParams.get("keyword");
    if (searchKeyword === "1") params.keyword = 1;

    const searchWname = searchParams.get("wname");
    if (searchWname === "1") params.wname = 1;

    try {
        const result = await fetchNarouNovels(params);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Search API error:", error);
        return NextResponse.json(
            { error: "検索に失敗しました" },
            { status: 500 }
        );
    }
}
