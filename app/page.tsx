"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import AddGameForm from "@/components/home/AddGameForm";
import GamePreviewCard from "@/components/home/GamePreviewCard";
import GameList from "@/components/home/GameList";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import type { Game } from "@/types";
import type { ScrapedGame } from "@/lib/scrapers/types";

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ScrapedGame | null>(null);
  const { toast } = useToast();

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch("/api/games");
      const data = await res.json();
      setGames(data);
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách game",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleConfirm = async () => {
    if (!preview) return;

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: preview.appId,
          platform: preview.platform,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPreview(null);
      toast({
        title: "✅ Đã thêm game",
        description: `${preview.name} đã được thêm vào danh sách`,
      });
      fetchGames();
    } catch (err) {
      toast({
        title: "Lỗi",
        description:
          err instanceof Error ? err.message : "Không thể thêm game",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/games/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa thất bại");

      toast({ title: "🗑️ Đã xóa game" });
      fetchGames();
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể xóa game",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Header />
      <main className="relative min-h-[calc(100vh-3.5rem)]">
        {/* Background effects */}
        <div className="absolute inset-0 dot-pattern pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative container mx-auto max-w-2xl px-4 py-10">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/5 px-4 py-1.5 text-xs text-purple-400 mb-4 animate-slide-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              AI-Powered Game Review Analysis
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <span className="text-gradient-animated">
                Phân tích review game
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Trích xuất &amp; phân nhóm vấn đề bằng AI — Tìm ra điểm yếu nhanh nhất
            </p>
          </div>

          {/* Add Game Form */}
          <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <AddGameForm onPreview={setPreview} />
          </div>

          {/* Game Preview */}
          {preview && (
            <div className="mb-6">
              <GamePreviewCard
                game={preview}
                onConfirm={handleConfirm}
                onCancel={() => setPreview(null)}
              />
            </div>
          )}

          <Separator className="mb-8 opacity-50" />

          {/* Game List */}
          <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Game đang theo dõi
              </h2>
              {games.length > 0 && (
                <span className="text-[10px] bg-purple-500/10 text-purple-400 rounded-full px-2 py-0.5 font-medium">
                  {games.length}
                </span>
              )}
            </div>
            <GameList
              games={games}
              loading={loading}
              onDelete={handleDelete}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="relative border-t border-border/40 mt-12">
          <div className="container mx-auto max-w-2xl px-4 py-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>GetRatingGame v0.1</span>
            <span>Powered by GPT-4o-mini</span>
          </div>
        </footer>
      </main>
    </>
  );
}
