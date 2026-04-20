import { NextResponse } from "next/server";
import { searchReviewsByAI, reRankWithGPT } from "@/lib/ai-search";
import { embedQuery, vectorSearch } from "@/lib/embeddings";
import { getDb } from "@/lib/db";
import type { Review } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, query } = body as { gameId: string; query: string };

    if (!gameId || !query?.trim()) {
      return NextResponse.json(
        { error: "gameId and query are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const q = query.trim();

    // Check if we have embeddings for this game
    const embeddingCount = db
      .prepare("SELECT COUNT(*) as cnt FROM reviews WHERE game_id = ? AND embedding IS NOT NULL")
      .get(gameId) as { cnt: number };

    if (embeddingCount.cnt > 0) {
      // ═══ STEP 1: Vector Search — get top 30 candidates (instant, free) ═══
      const queryVector = await embedQuery(q);
      const vectorResults = vectorSearch(gameId, queryVector, 0.25, 30);

      if (vectorResults.length > 0) {
        // Get full review data for candidates
        const candidateIds = vectorResults.map((r) => r.reviewId);
        const placeholders = candidateIds.map(() => "?").join(",");
        const rows = db
          .prepare(`SELECT * FROM reviews WHERE id IN (${placeholders})`)
          .all(...candidateIds) as Array<{
          id: string;
          game_id: string;
          score: number;
          user_name: string;
          title: string | null;
          text: string;
          date: string;
          version: string | null;
          device: string | null;
          thumbs_up: number;
          group_id: string | null;
          fetched_at: string;
        }>;

        const candidates: Review[] = rows.map((r) => ({
          id: r.id,
          gameId: r.game_id,
          score: r.score,
          userName: r.user_name,
          title: r.title ?? undefined,
          text: r.text,
          date: r.date,
          version: r.version ?? undefined,
          device: r.device ?? undefined,
          thumbsUp: r.thumbs_up,
          groupId: r.group_id,
          fetchedAt: r.fetched_at,
        }));

        // ═══ STEP 2: GPT Re-rank — reason about actual relevance ═══
        const reRanked = await reRankWithGPT(candidates, q);

        if (reRanked.length > 0) {
          return NextResponse.json({
            results: reRanked,
            total: reRanked.length,
            query: q,
            source: "vector+rerank",
            vectorCandidates: vectorResults.length,
          });
        }
      }
    }

    // ═══ FALLBACK: Full GPT search (no embeddings available) ═══
    const rows = db
      .prepare("SELECT * FROM reviews WHERE game_id = ? ORDER BY date DESC")
      .all(gameId) as Array<{
      id: string;
      game_id: string;
      score: number;
      user_name: string;
      title: string | null;
      text: string;
      date: string;
      version: string | null;
      device: string | null;
      thumbs_up: number;
      group_id: string | null;
      fetched_at: string;
    }>;

    const reviews: Review[] = rows
      .map((r) => ({
        id: r.id,
        gameId: r.game_id,
        score: r.score,
        userName: r.user_name,
        title: r.title ?? undefined,
        text: r.text,
        date: r.date,
        version: r.version ?? undefined,
        device: r.device ?? undefined,
        thumbsUp: r.thumbs_up,
        groupId: r.group_id,
        fetchedAt: r.fetched_at,
      }))
      .filter((r) => r.text.trim().length >= 15);

    if (reviews.length === 0) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const results = await searchReviewsByAI(reviews, q);

    return NextResponse.json({
      results,
      total: results.length,
      query: q,
      source: "ai",
    });
  } catch (error) {
    console.error("AI search error:", error);
    const message =
      error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
