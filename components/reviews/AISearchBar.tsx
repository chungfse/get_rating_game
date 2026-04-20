"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Loader2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  reviewId: string;
  relevance: number;
  reason: string;
}

interface Props {
  gameId: string;
  onSearchResults: (results: SearchResult[] | null, query: string) => void;
  isActive: boolean;
}

export default function AISearchBar({ gameId, onSearchResults, isActive }: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setSearching(true);
    try {
      const res = await fetch("/api/reviews/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, query: query.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSearchResults(data.results || [], query.trim());
    } catch (err) {
      console.error("Search error:", err);
      onSearchResults([], query.trim());
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    onSearchResults(null, "");
  };

  return (
    <div className="rounded-lg border bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          AI Search
        </h3>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 glow-border rounded-md">
          <input
            type="text"
            placeholder="VD: gameplay, quảng cáo, crash..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-1 focus:ring-offset-background transition-shadow"
          />
        </div>
        <Button
          size="sm"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 shrink-0"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Active search indicator */}
      {isActive && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-purple-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Đang lọc theo AI search
          </span>
          <button
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
            Xóa
          </button>
        </div>
      )}

      {searching && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>AI đang phân tích reviews...</span>
        </div>
      )}
    </div>
  );
}
