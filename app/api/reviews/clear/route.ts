import { NextResponse } from "next/server";
import { clearGameReviews } from "@/lib/db/cleanup";
import { getGame, updateLastFetchedAt } from "@/lib/db/games";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId } = body as { gameId: string };

    if (!gameId) {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 });
    }

    const game = getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const deleted = clearGameReviews(gameId);

    // Reset last fetched timestamp so next fetch gets all reviews
    updateLastFetchedAt(gameId, null);

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("Clear reviews error:", error);
    return NextResponse.json({ error: "Failed to clear reviews" }, { status: 500 });
  }
}
