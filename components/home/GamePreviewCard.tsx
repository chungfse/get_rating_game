"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StarRating from "@/components/ui/StarRating";
import PlatformBadge from "@/components/ui/PlatformBadge";
import { Check, X, Loader2 } from "lucide-react";
import type { ScrapedGame } from "@/lib/scrapers/types";
import { useState } from "react";

interface GamePreviewCardProps {
  game: ScrapedGame;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function GamePreviewCard({
  game,
  onConfirm,
  onCancel,
}: GamePreviewCardProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="animate-in fade-in slide-in-from-top-2 border-purple-500/30 bg-purple-500/5 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 pointer-events-none" />
      <CardContent className="relative flex items-center gap-4 p-4">
        {/* Game Icon */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-purple-500/20">
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

        {/* Game Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{game.name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {game.developer}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <StarRating score={game.currentRating} showNumber />
            <PlatformBadge platform={game.platform} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <Button
            id="confirm-add-game"
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">Thêm</span>
          </Button>
          <Button
            id="cancel-add-game"
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
