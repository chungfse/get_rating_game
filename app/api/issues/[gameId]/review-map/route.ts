import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const body = await request.json();
    const { reviewIds } = body as { reviewIds: string[] };

    if (!reviewIds || reviewIds.length === 0) {
      return NextResponse.json({});
    }

    const db = getDb();
    const placeholders = reviewIds.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT review_id, issue_id FROM review_issues
         WHERE game_id = ? AND review_id IN (${placeholders})`
      )
      .all(params.gameId, ...reviewIds) as Array<{
      review_id: string;
      issue_id: string;
    }>;

    // Build map: reviewId -> issueId[]
    const map: Record<string, string[]> = {};
    for (const row of rows) {
      if (!map[row.review_id]) {
        map[row.review_id] = [];
      }
      map[row.review_id].push(row.issue_id);
    }

    return NextResponse.json(map);
  } catch (error) {
    console.error("Get review-issue map error:", error);
    return NextResponse.json(
      { error: "Failed to get review-issue map" },
      { status: 500 }
    );
  }
}
