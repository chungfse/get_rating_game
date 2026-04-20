"use client";

import { useState, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import StarRating from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Smartphone, ThumbsUp } from "lucide-react";
import type { Review, Issue, IssueSeverity } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  review: Review;
  issues: Issue[];
  reviewIssueIds: string[];
}

const severityColors: Record<IssueSeverity, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const ReviewCard = memo(function ReviewCard({ review, issues, reviewIssueIds }: Props) {
  const [expanded, setExpanded] = useState(false);

  const matchedIssues = issues.filter((i) => reviewIssueIds.includes(i.id));

  const isLong = review.text.length > 200;

  const reviewDate = new Date(review.date).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Star accent color for left border
  const starBorderColors: Record<number, string> = {
    1: "border-l-red-500",
    2: "border-l-orange-500",
    3: "border-l-yellow-500",
    4: "border-l-lime-500",
    5: "border-l-green-500",
  };

  return (
    <Card className={cn(
      "group hover:border-border/80 transition-all duration-200 border-l-2 overflow-hidden",
      starBorderColors[review.score] || "border-l-border"
    )}>
      <CardContent className="p-4" suppressHydrationWarning>
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <StarRating score={review.score} size="sm" />
          <span className="text-sm font-medium text-foreground/80">
            {review.userName}
          </span>
          <span className="text-xs text-muted-foreground">· {reviewDate}</span>
          {review.version && (
            <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-mono">
              v{review.version}
            </span>
          )}
          {review.device && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Smartphone className="h-3 w-3" />
              {review.device}
            </span>
          )}
        </div>

        {/* Issue badges — multiple! */}
        {matchedIssues.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {matchedIssues.map((issue) => (
              <Badge
                key={issue.id}
                variant="outline"
                className={cn(
                  "text-[10px] cursor-default",
                  severityColors[issue.severity]
                )}
              >
                {issue.severity === "critical" && "🔴 "}
                {issue.severity === "high" && "🟠 "}
                {issue.severity === "medium" && "🟡 "}
                {issue.severity === "low" && "🔵 "}
                {issue.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Title */}
        {review.title && (
          <p className="text-sm font-semibold mb-1">{review.title}</p>
        )}

        {/* Text content */}
        <div
          className={cn(
            "text-sm text-foreground/80 whitespace-pre-line leading-relaxed overflow-hidden transition-all duration-300",
            !expanded && isLong && "max-h-[4.5em]"
          )}
          suppressHydrationWarning
        >
          <p suppressHydrationWarning>{review.text}</p>
        </div>

        {/* Expand/collapse for long text */}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1.5 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            translate="no"
          >
            <span className={expanded ? "flex items-center gap-1" : "hidden"}>
              <ChevronUp className="h-3 w-3" /> Thu gọn
            </span>
            <span className={expanded ? "hidden" : "flex items-center gap-1"}>
              <ChevronDown className="h-3 w-3" /> Xem thêm
            </span>
          </button>
        )}

        {/* Thumbs up */}
        {(review.thumbsUp ?? 0) > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <ThumbsUp className="h-3 w-3" />
            <span>{review.thumbsUp}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default ReviewCard;
