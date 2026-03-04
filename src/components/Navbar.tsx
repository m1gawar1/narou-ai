"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Search, Trophy, Heart } from "lucide-react";

const NAV_ITEMS = [
    { href: "/", label: "検索", icon: Search },
    { href: "/ranking", label: "ランキング", icon: Trophy },
    { href: "/favorites", label: "お気に入り", icon: Heart },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <>
            {/* --- PC Header (md以上) --- */}
            <header className="hidden md:block border-b border-border sticky top-0 z-50 glass">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <BookOpen className="text-white w-4.5 h-4.5" />
                        </div>
                        <h1 className="text-lg font-bold gradient-text leading-tight">なろう小説ファインダー</h1>
                    </Link>
                    <nav className="flex items-center gap-1">
                        {NAV_ITEMS.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`nav-link flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? "bg-primary/15 text-primary-light"
                                        : "text-muted hover:text-foreground hover:bg-white/5"
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </header>

            {/* --- Mobile Header (md未満) --- */}
            <header className="md:hidden border-b border-border sticky top-0 z-50 glass">
                <div className="px-4 py-3 flex items-center justify-center">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg">
                            <BookOpen className="text-white w-4 h-4" />
                        </div>
                        <h1 className="text-base font-bold gradient-text">なろう小説ファインダー</h1>
                    </Link>
                </div>
            </header>

            {/* --- Mobile Bottom Navigation (md未満) --- */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-area-bottom">
                <div className="flex items-stretch justify-around">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-3 flex-1 transition-all ${isActive
                                    ? "text-primary-light"
                                    : "text-muted"
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]" : ""}`} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                                {isActive && (
                                    <div className="absolute top-0 w-8 h-0.5 bg-primary rounded-b-full" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
