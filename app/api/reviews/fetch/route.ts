import { NextResponse } from "next/server";
import { getGame, updateLastFetchedAt } from "@/lib/db/games";
import { insertReviews } from "@/lib/db/reviews";
import { scrapeReviews } from "@/lib/scrapers";
import { generateEmbeddings } from "@/lib/embeddings";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, limit = 500, version, versions } = body as {
      gameId: string;
      limit?: number;
      version?: string;
      versions?: string[]; // multi-version fetch
    };

    if (!gameId) {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 });
    }

    const game = getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Check how many reviews we already have
    const db = getDb();
    const existing = db
      .prepare("SELECT COUNT(*) as cnt FROM reviews WHERE game_id = ?")
      .get(gameId) as { cnt: number };

    // Use lastFetchedAt to only get newer reviews (incremental fetch)
    const afterDate = game.lastFetchedAt || undefined;

    // Scrape reviews from store — support multi-version
    let scrapedReviews;
    if (versions && versions.length > 0) {
      // Fetch per-version and merge (deduplicated by id)
      const seen = new Set<string>();
      const merged: Awaited<ReturnType<typeof scrapeReviews>> = [];
      const perVersionLimit = Math.ceil(limit / versions.length);

      for (const v of versions) {
        const batch = await scrapeReviews(game.appId, game.platform, {
          limit: perVersionLimit,
          version: v,
          // No afterDate when fetching by version — get full version data
        });
        for (const r of batch) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            merged.push(r);
          }
        }
      }
      scrapedReviews = merged;
    } else {
      scrapedReviews = await scrapeReviews(game.appId, game.platform, {
        limit,
        afterDate,
        version,
      });
    }

    // Insert into DB (INSERT OR IGNORE — no duplicates)
    const inserted = insertReviews(
      scrapedReviews.map((r) => ({
        id: r.id,
        gameId,
        score: r.score,
        userName: r.userName,
        title: r.title,
        text: r.text,
        date: r.date,
        version: r.version,
        device: r.device,
        thumbsUp: r.thumbsUp,
        groupId: null,
      }))
    );

    // Update last fetched timestamp
    updateLastFetchedAt(gameId);

    // Auto-generate embeddings for new reviews (enables instant vector search)
    let embeddingsGenerated = 0;
    if (inserted > 0) {
      try {
        embeddingsGenerated = await generateEmbeddings(gameId);
      } catch (err) {
        console.error("[Embeddings] Auto-generate failed (non-blocking):", err);
      }
    }

    // Get new total
    const newTotal = db
      .prepare("SELECT COUNT(*) as cnt FROM reviews WHERE game_id = ?")
      .get(gameId) as { cnt: number };

    return NextResponse.json({
      fetched: scrapedReviews.length,
      inserted,
      existingBefore: existing.cnt,
      totalAfter: newTotal.cnt,
      embeddingsGenerated,
    });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch reviews";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
