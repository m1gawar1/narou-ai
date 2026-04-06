"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Trophy, Heart } from "lucide-react";

const NAV_ITEMS = [
    { href: "/", label: "検索", icon: Search },
    { href: "/ranking", label: "ランキング", icon: Trophy },
    { href: "/favorites", label: "お気に入り", icon: Heart },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <>
            {/* ===== PC Header ===== */}
            <header
                className="hidden md:block sticky top-0 z-50"
                style={{
                    background: "rgba(240, 235, 224, 0.85)",
                    backdropFilter: "blur(20px) saturate(130%)",
                    WebkitBackdropFilter: "blur(20px) saturate(130%)",
                    borderBottom: "1px solid rgba(24, 21, 15, 0.10)",
                    boxShadow: "0 1px 0 rgba(24,21,15,0.05)",
                }}
            >
                <div style={{ height: "2px", background: "linear-gradient(90deg, #1a2744 0%, #b8883a 50%, #1a2744 100%)" }} />
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex flex-col leading-none">
                        <span style={{ fontSize: "18px", fontWeight: 700, color: "#1a2744", letterSpacing: "0.06em", lineHeight: 1 }}>
                            なろう小説ファインダー
                        </span>
                        <span style={{ fontSize: "9px", letterSpacing: "0.20em", color: "#b8883a", marginTop: "3px", fontWeight: 500, textTransform: "uppercase" }}>
                            Novel Discovery
                        </span>
                    </Link>
                    <nav className="flex items-center">
                        <div style={{ width: "1px", height: "20px", background: "rgba(24,21,15,0.12)", marginRight: "24px" }} />
                        <div className="flex items-center gap-1">
                            {NAV_ITEMS.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="nav-link flex items-center gap-1.5 px-4 py-2 text-sm transition-colors"
                                        style={{
                                            color: isActive ? "#1a2744" : "#7a7369",
                                            fontWeight: isActive ? 600 : 400,
                                            letterSpacing: "0.04em",
                                        }}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                </div>
            </header>

            {/* ===== Mobile Header ===== */}
            <header
                className="md:hidden sticky top-0 z-50"
                style={{
                    background: "rgba(240, 235, 224, 0.88)",
                    backdropFilter: "blur(20px) saturate(130%)",
                    WebkitBackdropFilter: "blur(20px) saturate(130%)",
                    borderBottom: "1px solid rgba(24, 21, 15, 0.10)",
                }}
            >
                <div style={{ height: "2px", background: "linear-gradient(90deg, #1a2744 0%, #b8883a 50%, #1a2744 100%)" }} />
                <div className="px-4 py-3 flex items-center justify-center">
                    <Link href="/" className="flex flex-col items-center leading-none">
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "#1a2744", letterSpacing: "0.06em" }}>
                            なろう小説ファインダー
                        </span>
                        <span style={{ fontSize: "8px", letterSpacing: "0.18em", color: "#b8883a", marginTop: "2px", textTransform: "uppercase" }}>
                            Novel Discovery
                        </span>
                    </Link>
                </div>
            </header>

            {/* ===== Mobile Bottom Navigation ===== */}
            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
                style={{
                    background: "rgba(240, 235, 224, 0.92)",
                    backdropFilter: "blur(20px) saturate(130%)",
                    WebkitBackdropFilter: "blur(20px) saturate(130%)",
                    borderTop: "1px solid rgba(24, 21, 15, 0.10)",
                    boxShadow: "0 -1px 0 rgba(24,21,15,0.04)",
                }}
            >
                <div className="flex items-stretch justify-around">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex flex-col items-center justify-center gap-0.5 py-3 px-3 flex-1 relative transition-colors"
                                style={{ color: isActive ? "#1a2744" : "#9a9088" }}
                            >
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6" style={{ height: "2px", background: "#b8883a" }} />
                                )}
                                <Icon style={{ width: "18px", height: "18px" }} />
                                <span style={{ fontSize: "10px", fontWeight: isActive ? 600 : 400, letterSpacing: "0.04em" }}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
