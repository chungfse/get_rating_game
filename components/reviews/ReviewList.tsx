"use client";

import ReviewCard from "@/components/reviews/ReviewCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown } from "lucide-react";
import type { Review, Issue } from "@/types";

interface Props {
  reviews: Review[];
  issues: Issue[];
  reviewIssueMap: Record<string, string[]>;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export default function ReviewList({
  reviews,
  issues,
  reviewIssueMap,
  loading,
  hasMore,
  onLoadMore,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg animate-shimmer" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 mb-4">
          <span className="text-3xl">📝</span>
        </div>
        <p className="font-medium text-foreground/80">Chưa có review nào</p>
        <p className="text-sm mt-1">
          Click &quot;Fetch Reviews&quot; để tải review từ store
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review, index) => (
        <div
          key={review.id}
          className="animate-slide-up"
          style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
        >
          <ReviewCard
            review={review}
            issues={issues}
            reviewIssueIds={reviewIssueMap[review.id] || []}
          />
        </div>
      ))}

      {hasMore && (
        <div className="text-center pt-4 pb-2">
          <Button
            id="load-more-reviews"
            variant="outline"
            onClick={onLoadMore}
            className="w-full max-w-xs hover:border-purple-500/30 transition-colors"
          >
            <ChevronDown className="mr-2 h-4 w-4" />
            Load thêm reviews
          </Button>
        </div>
      )}
    </div>
  );
}
