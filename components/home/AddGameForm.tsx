"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import type { Platform } from "@/types";
import type { ScrapedGame } from "@/lib/scrapers/types";

interface AddGameFormProps {
  onPreview: (game: ScrapedGame) => void;
}

export default function AddGameForm({ onPreview }: AddGameFormProps) {
  const [platform, setPlatform] = useState<Platform>("android");
  const [appId, setAppId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!appId.trim()) {
      setError("Vui lòng nhập App ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: appId.trim(), platform }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi không xác định");

      onPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi fetch game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Platform Toggle */}
      <div className="flex gap-2">
        <button
          id="platform-toggle-android"
          onClick={() => setPlatform("android")}
          className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all duration-200 ${
            platform === "android"
              ? "border-green-500/50 bg-green-500/10 text-green-400 shadow-lg shadow-green-500/5"
              : "border-border text-muted-foreground hover:border-green-500/30 hover:text-green-400 hover:bg-green-500/5"
          }`}
        >
          <span className="mr-2">🤖</span>
          Google Play
        </button>
        <button
          id="platform-toggle-ios"
          onClick={() => setPlatform("ios")}
          className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all duration-200 ${
            platform === "ios"
              ? "border-blue-500/50 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/5"
              : "border-border text-muted-foreground hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/5"
          }`}
        >
          <span className="mr-2">🍎</span>
          App Store
        </button>
      </div>

      {/* App ID Input */}
      <div className="flex gap-2">
        <div className="flex-1 glow-border rounded-md">
          <input
            id="app-id-input"
            type="text"
            placeholder={
              platform === "android"
                ? "com.supercell.clashroyale"
                : "1349230046"
            }
            value={appId}
            onChange={(e) => {
              setAppId(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-background transition-shadow"
          />
        </div>
        <Button
          id="fetch-preview-button"
          onClick={handleFetch}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">
            {loading ? "Đang tìm..." : "Tìm game"}
          </span>
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
