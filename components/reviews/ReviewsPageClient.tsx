"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import GameHeader from "@/components/reviews/GameHeader";
import StarFilterPanel from "@/components/reviews/StarFilterPanel";
import IssuesPanel from "@/components/reviews/IssuesPanel";
import AISearchBar from "@/components/reviews/AISearchBar";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewStats from "@/components/reviews/ReviewStats";
import SortSelector from "@/components/reviews/SortSelector";
import VersionPickerModal from "@/components/reviews/VersionPickerModal";
import { useToast } from "@/components/ui/use-toast";
import type { Game, Review, Issue } from "@/types";

interface SearchResult {
  reviewId: string;
  relevance: number;
  reason: string;
}

interface Props {
  game: Game;
}

type SortOption = "newest" | "oldest" | "rating_asc" | "rating_desc";

export default function ReviewsPageClient({ game }: Props) {
  const { toast } = useToast();

  // State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [starCounts, setStarCounts] = useState<Record<number, number>>({});
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueCounts, setIssueCounts] = useState<Record<string, number>>({});
  const [reviewIssueMap, setReviewIssueMap] = useState<Record<string, string[]>>({});
  const [page, setPage] = useState(1);

  // Filters
  const [selectedStars, setSelectedStars] = useState<number[]>([1, 2, 3, 4]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");

  // AI Search state
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchReviewIds, setSearchReviewIds] = useState<string[] | null>(null);

  // Loading states
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [fetchingReviews, setFetchingReviews] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Version picker
  const [showVersionPicker, setShowVersionPicker] = useState(false);

  // Handle AI search results
  const handleSearchResults = (results: SearchResult[] | null, query: string) => {
    setSearchResults(results);
    setSearchQuery(query);
    if (results && results.length > 0) {
      setSearchReviewIds(results.map((r) => r.reviewId));
      setSelectedIssueId(null);
      setPage(1);
    } else if (results !== null) {
      // Empty results
      setSearchReviewIds([]);
    } else {
      // Cleared
      setSearchReviewIds(null);
    }
  };

  // Fetch reviews from DB
  const loadReviews = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        setReviewsLoading(!append);
        const params = new URLSearchParams({
          gameId: game.id,
          stars: selectedStars.join(","),
          page: pageNum.toString(),
          sort,
        });
        if (selectedIssueId) params.set("issueId", selectedIssueId);

        const res = await fetch(`/api/reviews?${params}`);
        const data = await res.json();

        if (append) {
          setReviews((prev) => [...prev, ...data.reviews]);
        } else {
          setReviews(data.reviews);
        }
        setTotal(data.total);
        setStarCounts(data.starCounts || {});
        setIssueCounts(data.issueCounts || {});
        setPage(pageNum);
      } catch {
        toast({
          title: "Lỗi",
          description: "Không thể tải reviews",
          variant: "destructive",
        });
      } finally {
        setReviewsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.id, selectedStars, selectedIssueId, sort, toast]
  );

  // Fetch issues
  const loadIssues = useCallback(async () => {
    try {
      const res = await fetch(`/api/issues/${game.id}`);
      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch {
      // Issues may not exist yet
    }
  }, [game.id]);

  // Fetch review-issue map for current reviews
  const loadReviewIssueMap = useCallback(async () => {
    if (reviews.length === 0 || issues.length === 0) {
      setReviewIssueMap({});
      return;
    }

    try {
      // Fetch from the junction table via a lightweight API
      const reviewIds = reviews.map((r) => r.id);
      const res = await fetch(`/api/issues/${game.id}/review-map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewIds }),
      });
      const data = await res.json();
      setReviewIssueMap(data || {});
    } catch {
      setReviewIssueMap({});
    }
  }, [reviews, issues, game.id]);

  // Initial load
  useEffect(() => {
    loadReviews(1);
    loadIssues();
  }, [loadReviews, loadIssues]);

  // Load review-issue map when reviews or issues change
  useEffect(() => {
    loadReviewIssueMap();
  }, [loadReviewIssueMap]);

  // Fetch reviews from store
  const handleFetchReviews = async (limit: number) => {
    setFetchingReviews(true);
    try {
      const res = await fetch("/api/reviews/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id, limit }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "✅ Đã fetch reviews",
        description: data.inserted > 0
          ? `${data.inserted} review mới (tổng: ${data.totalAfter})`
          : `Không có review mới (đã có ${data.totalAfter} trong DB)`,
      });

      loadReviews(1);
    } catch (err) {
      toast({
        title: "Lỗi fetch reviews",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
        variant: "destructive",
      });
    } finally {
      setFetchingReviews(false);
    }
  };

  // Fetch reviews by selected versions (from VersionPickerModal)
  const handleVersionFetch = async (versions: string[], limit: number) => {
    setFetchingReviews(true);
    try {
      const res = await fetch("/api/reviews/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id, limit, versions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "✅ Đã fetch reviews theo version",
        description: data.inserted > 0
          ? `${data.inserted} review mới từ ${versions.length} version (tổng: ${data.totalAfter})`
          : `Không có review mới (đã có ${data.totalAfter} trong DB)`,
      });

      loadReviews(1);
    } catch (err) {
      toast({
        title: "Lỗi fetch by version",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
        variant: "destructive",
      });
    } finally {
      setFetchingReviews(false);
    }
  };

  // AI analysis
  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "🤖 Phân tích hoàn tất",
        description: `${data.issues?.length || 0} vấn đề được tìm thấy`,
      });

      loadIssues();
      loadReviews(1);
    } catch (err) {
      toast({
        title: "Lỗi phân tích",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Clear reviews
  const handleClearReviews = async () => {
    if (!confirm(`Xóa tất cả reviews và phân tích của "${game.name}"?`)) return;

    try {
      const res = await fetch("/api/reviews/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "🗑️ Đã xóa",
        description: `${data.deleted} reviews đã được xóa`,
      });

      setReviews([]);
      setTotal(0);
      setIssues([]);
      setIssueCounts({});
      setReviewIssueMap({});
      setSearchResults(null);
      setSearchReviewIds(null);
      loadReviews(1);
      loadIssues();
    } catch (err) {
      toast({
        title: "Lỗi xóa reviews",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
        variant: "destructive",
      });
    }
  };

  // Load more
  const handleLoadMore = () => {
    loadReviews(page + 1, true);
  };

  // Build filtered issues: override frequency with filtered count from star selection
  const filteredIssues = issues
    .map((i) => ({
      ...i,
      frequency: issueCounts[i.id] ?? 0,
    }))
    .filter((i) => i.frequency > 0);

  // If AI search is active, filter reviews client-side by search result IDs
  const filteredSearchReviews = searchReviewIds !== null
    ? reviews.filter((r) => searchReviewIds.includes(r.id))
    : reviews;

  return (
    <>
      {showVersionPicker && (
        <VersionPickerModal
          gameId={game.id}
          onClose={() => setShowVersionPicker(false)}
          onFetch={handleVersionFetch}
        />
      )}
      <Header />
      <main className="relative min-h-[calc(100vh-3.5rem)]">
        {/* Background effects */}
        <div className="absolute inset-0 dot-pattern pointer-events-none opacity-50" />

        <div className="relative container mx-auto max-w-5xl px-4 py-6">
          <div className="animate-slide-up">
            <GameHeader
              game={game}
              onFetchReviews={handleFetchReviews}
              onFetchByVersion={() => setShowVersionPicker(true)}
              onAnalyze={handleAnalyze}
              onClearReviews={handleClearReviews}
              fetchingReviews={fetchingReviews}
              analyzing={analyzing}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
            {/* Sidebar */}
            <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <AISearchBar
                gameId={game.id}
                onSearchResults={handleSearchResults}
                isActive={searchReviewIds !== null}
              />
              <StarFilterPanel
                starCounts={starCounts}
                selectedStars={selectedStars}
                onStarsChange={(stars) => {
                  setSelectedStars(stars);
                  setSelectedIssueId(null);
                  setSearchResults(null);
                  setSearchReviewIds(null);
                  setPage(1);
                }}
              />
              <SortSelector value={sort} onChange={setSort} />
            </div>

            {/* Main Content */}
            <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {/* Issues Panel */}
              {filteredIssues.length > 0 && (
                <IssuesPanel
                  issues={filteredIssues}
                  selectedIssueId={selectedIssueId}
                  onIssueSelect={setSelectedIssueId}
                />
              )}

              {/* Search results indicator */}
              {searchReviewIds !== null && (
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 flex items-center gap-2 text-sm">
                  <span className="text-purple-400">✨</span>
                  <span className="text-foreground/80">
                    AI tìm thấy <strong className="text-purple-400">{searchReviewIds.length}</strong> reviews
                    liên quan đến &quot;<strong>{searchQuery}</strong>&quot;
                  </span>
                </div>
              )}

              {/* Stats */}
              <ReviewStats
                shown={searchReviewIds !== null ? filteredSearchReviews.length : reviews.length}
                total={searchReviewIds !== null ? searchReviewIds.length : total}
                selectedStars={selectedStars}
                selectedIssueId={selectedIssueId}
                issues={filteredIssues}
              />

              {/* Reviews */}
              <ReviewList
                reviews={searchReviewIds !== null ? filteredSearchReviews : reviews}
                issues={filteredIssues}
                reviewIssueMap={reviewIssueMap}
                loading={reviewsLoading}
                hasMore={searchReviewIds === null && reviews.length < total}
                onLoadMore={handleLoadMore}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative border-t border-border/40 mt-12">
          <div className="container mx-auto max-w-5xl px-4 py-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>GetRatingGame v0.2</span>
            <span>Powered by GPT-4o-mini</span>
          </div>
        </footer>
      </main>
    </>
  );
}
