import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { fetchNarouNovels, GENRE_MAP } from "@/lib/narou";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: google("gemini-1.5-flash"),
        messages,
        system: `あなたは「小説家になろう」の作品に精通したAIコンシェルジュです。
ユーザーの好みや要望を聞き出し、最適な小説を提案してください。

提案する際は、なろうAPIから取得した情報を元に、以下の点に注意してください：
- タイトル、あらすじ、ジャンルを魅力的に紹介する。
- なぜその作品がユーザーの要望に合っているのかを説明する。
- 複数の候補がある場合は、比較しやすいように提示する。

検索ツールを使用して、実際のなろう小説のデータを取得して回答してください。`,
        tools: {
            searchNovels: tool({
                description: "なろう小説を検索する",
                parameters: z.object({
                    word: z.string().optional().describe("検索単語"),
                    genre: z.number().optional().describe("ジャンルコード"),
                    order: z.string().optional().describe("並び順 (hyoka, favnovelcnt, weekly, points等)"),
                    lim: z.number().optional().default(5).describe("取得件数"),
                }),
                execute: async ({ word, genre, order, lim }) => {
                    const novels = await fetchNarouNovels({
                        word,
                        genre,
                        order,
                        lim,
                    });
                    return novels.map((n) => ({
                        title: n.title,
                        writer: n.writer,
                        story: n.story,
                        genre: GENRE_MAP[n.genre] || "不明",
                        ncode: n.ncode,
                        url: `https://ncode.syosetu.com/${n.ncode.toLowerCase()}/`,
                        points: n.all_point,
                    }));
                },
            }),
        },
    });

    return result.toDataStreamResponse();
}
