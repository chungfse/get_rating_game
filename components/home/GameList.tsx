"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StarRating from "@/components/ui/StarRating";
import PlatformBadge from "@/components/ui/PlatformBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Trash2, AlertTriangle } from "lucide-react";
import type { Game } from "@/types";

interface GameListProps {
  games: Game[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export default function GameList({ games, loading, onDelete }: GameListProps) {
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 mb-4">
          <span className="text-3xl">🎮</span>
        </div>
        <p className="font-medium text-foreground/80">Chưa có game nào</p>
        <p className="text-sm mt-1">
          Nhập App ID ở trên để bắt đầu phân tích review
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {games.map((game, index) => (
          <div
            key={game.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <Card className="group card-lift hover:border-purple-500/30 transition-all duration-200 overflow-hidden">
              <CardContent className="flex items-center gap-4 p-4 relative">
                {/* Subtle accent bar on hover */}
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Game Icon */}
                <Link href={`/games/${game.id}`} className="shrink-0">
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg shadow-md group-hover:shadow-purple-500/20 transition-shadow ring-1 ring-white/5">
                    {game.iconUrl ? (
                      <Image
                        src={game.iconUrl}
                        alt={game.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-xl">
                        🎮
                      </div>
                    )}
                  </div>
                </Link>

                {/* Game Info */}
                <Link href={`/games/${game.id}`} className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate group-hover:text-purple-400 transition-colors">
                    {game.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating score={game.currentRating} size="sm" showNumber />
                    <PlatformBadge platform={game.platform} />
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    id={`delete-game-${game.id}`}
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTarget(game);
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Link href={`/games/${game.id}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-purple-400"
                    >
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              Xóa game
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa <strong>{deleteTarget?.name}</strong> và toàn bộ dữ liệu
              (reviews, phân tích AI)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              id="cancel-delete"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Hủy
            </Button>
            <Button
              id="confirm-delete"
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              🗑️ Xóa game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
