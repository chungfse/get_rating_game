import { NextResponse } from "next/server";
import { getGame } from "@/lib/db/games";
import { scrapeReviews } from "@/lib/scrapers";

export interface VersionStat {
  version: string;
  count: number;
  earliestReviewDate: string; // ISO date — earliest review for this version ≈ release time
}

/**
 * POST /api/reviews/versions
 * Scrape newest reviews and group by version to show version stats + release date.
 * Body: { gameId: string, sampleSize?: number }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, sampleSize = 500 } = body as {
      gameId: string;
      sampleSize?: number;
    };

    if (!gameId) {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 });
    }

    const game = getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Scrape a fresh batch (no afterDate filter) to discover versions
    const reviews = await scrapeReviews(game.appId, game.platform, {
      limit: sampleSize,
    });

    // Aggregate by version: count + track earliest review date per version
    const versionMap = new Map<string, { count: number; earliestDate: string }>();
    for (const r of reviews) {
      const v = r.version?.trim() || "Unknown";
      const existing = versionMap.get(v);
      const reviewDate = r.date || new Date().toISOString();
      if (!existing) {
        versionMap.set(v, { count: 1, earliestDate: reviewDate });
      } else {
        existing.count += 1;
        // Keep the earliest (oldest) date — closest to when version was released
        if (reviewDate < existing.earliestDate) {
          existing.earliestDate = reviewDate;
        }
      }
    }

    // Sort: primary = version desc (newest version first), secondary = count desc
    const versions: VersionStat[] = Array.from(versionMap.entries())
      .map(([version, { count, earliestDate }]) => ({
        version,
        count,
        earliestReviewDate: earliestDate,
      }))
      .sort((a, b) => {
        // Primary: version string desc (semver-aware numeric sort)
        const vCmp = b.version.localeCompare(a.version, undefined, { numeric: true });
        if (vCmp !== 0) return vCmp;
        // Secondary: count desc
        return b.count - a.count;
      });

    return NextResponse.json({
      versions,
      totalSampled: reviews.length,
    });
  } catch (error) {
    console.error("Version stats error:", error);
    const message = error instanceof Error ? error.message : "Failed to get versions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
