"use client";

import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] glass">
      <div className="container mx-auto flex h-14 max-w-5xl items-center px-4">
        {!isHome && (
          <Link
            href="/"
            className="mr-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            id="back-button"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Quay lại</span>
          </Link>
        )}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg group"
          id="logo-link"
        >
          <div className="relative">
            <Gamepad2 className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-purple-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            GetRatingGame
          </span>
        </Link>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground hidden sm:block">
          Phân tích review game bằng AI
        </span>
      </div>
    </header>
  );
}
