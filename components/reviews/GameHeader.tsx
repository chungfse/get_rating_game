"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import StarRating from "@/components/ui/StarRating";
import PlatformBadge from "@/components/ui/PlatformBadge";
import { Bot, Loader2, Download, Trash2, GitBranch } from "lucide-react";
import type { Game } from "@/types";
import { useState } from "react";

interface Props {
  game: Game;
  onFetchReviews: (limit: number) => Promise<void>;
  onFetchByVersion: () => void;
  onAnalyze: () => Promise<void>;
  onClearReviews: () => Promise<void>;
  fetchingReviews: boolean;
  analyzing: boolean;
}

export default function GameHeader({
  game,
  onFetchReviews,
  onFetchByVersion,
  onAnalyze,
  onClearReviews,
  fetchingReviews,
  analyzing,
}: Props) {
  const [limit, setLimit] = useState(500);

  return (
    <div className="rounded-xl border bg-card/50 p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Game Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-white/10">
            {game.iconUrl ? (
              <Image
                src={game.iconUrl}
                alt={game.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-2xl">
                🎮
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{game.name}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <StarRating score={game.currentRating} showNumber />
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {game.totalReviews?.toLocaleString()} reviews
              </span>
              <PlatformBadge platform={game.platform} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Limit selector */}
          <select
            id="fetch-limit-select"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs focus:ring-2 focus:ring-purple-500/30 focus:outline-none transition-shadow"
          >
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>

          {/* Fetch reviews */}
          <Button
            id="fetch-reviews-button"
            variant="outline"
            size="sm"
            onClick={() => onFetchReviews(limit)}
            disabled={fetchingReviews}
            className="relative overflow-hidden"
          >
            {fetchingReviews ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            {fetchingReviews ? "Đang tải..." : "Fetch Reviews"}
            {fetchingReviews && (
              <div className="absolute inset-0 animate-shimmer" />
            )}
          </Button>

          {/* Fetch by version */}
          <Button
            id="fetch-by-version-button"
            variant="outline"
            size="sm"
            onClick={onFetchByVersion}
            disabled={fetchingReviews}
            title="Lấy reviews theo build version"
            className="relative overflow-hidden border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50 hover:text-purple-300 transition-colors"
          >
            <GitBranch className="h-4 w-4 mr-1.5" />
            By Version
          </Button>

          {/* Clear reviews */}
          <Button
            id="clear-reviews-button"
            variant="ghost"
            size="sm"
            onClick={onClearReviews}
            disabled={fetchingReviews || analyzing}
            className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Xóa tất cả reviews & phân tích"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          {/* Analyze */}
          <Button
            id="analyze-button"
            size="sm"
            onClick={onAnalyze}
            disabled={analyzing}
            className="bg-purple-600 hover:bg-purple-700 text-white relative overflow-hidden shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-shadow"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Bot className="h-4 w-4 mr-1.5" />
            )}
            {analyzing ? "Đang phân tích..." : "Phân tích vấn đề"}
            {analyzing && (
              <div className="absolute inset-0 animate-shimmer" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
