import { NextResponse } from "next/server";
import { getReviews, getReviewCountByStar } from "@/lib/db/reviews";
import { getIssueCountsFiltered } from "@/lib/db/issues";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");

    if (!gameId) {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 });
    }

    const starsParam = searchParams.get("stars");
    const stars = starsParam
      ? starsParam.split(",").map(Number).filter((n) => n >= 1 && n <= 5)
      : undefined;

    const issueId = searchParams.get("issueId") || undefined;
    const groupId = searchParams.get("groupId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const sort = (searchParams.get("sort") as "newest" | "oldest" | "rating_asc" | "rating_desc") || "newest";

    // If filtering by issueId, get the review IDs for that issue first
    let reviewIdsForIssue: string[] | undefined;
    if (issueId) {
      const { getDb } = await import("@/lib/db");
      const db = getDb();

      // Build query for review IDs matching issue + star filter
      const conditions: string[] = ["ri.issue_id = ?", "ri.game_id = ?"];
      const params: (string | number)[] = [issueId, gameId];

      if (stars && stars.length > 0 && stars.length < 5) {
        const placeholders = stars.map(() => "?").join(",");
        conditions.push(`r.score IN (${placeholders})`);
        params.push(...stars);
      }

      const rows = db
        .prepare(
          `SELECT DISTINCT ri.review_id
           FROM review_issues ri
           JOIN reviews r ON r.id = ri.review_id
           WHERE ${conditions.join(" AND ")}`
        )
        .all(...params) as Array<{ review_id: string }>;

      reviewIdsForIssue = rows.map((r) => r.review_id);
    }

    const { reviews, total } = getReviews({
      gameId,
      stars,
      groupId,
      page,
      sort,
      reviewIds: reviewIdsForIssue,
    });

    // Get star counts for the filter panel
    const starCounts = getReviewCountByStar(gameId);

    // Get issue counts filtered by current star selection
    const issueCounts = getIssueCountsFiltered(gameId, stars);

    return NextResponse.json({
      reviews,
      total,
      page,
      starCounts,
      issueCounts,
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json({ error: "Failed to get reviews" }, { status: 500 });
  }
}
