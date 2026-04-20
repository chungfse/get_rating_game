import { NextResponse } from "next/server";
import { getAllGames, insertGame } from "@/lib/db/games";
import { scrapeGameInfo } from "@/lib/scrapers";
import type { Platform } from "@/types";

export async function GET() {
  try {
    const games = getAllGames();
    return NextResponse.json(games);
  } catch (error) {
    console.error("Get games error:", error);
    return NextResponse.json({ error: "Failed to get games" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appId, platform } = body as { appId: string; platform: Platform };

    if (!appId || !platform) {
      return NextResponse.json(
        { error: "appId and platform are required" },
        { status: 400 }
      );
    }

    // Fetch game info from store
    const gameInfo = await scrapeGameInfo(appId.trim(), platform);

    // Save to DB
    const game = insertGame({
      appId: gameInfo.appId,
      platform: gameInfo.platform,
      name: gameInfo.name,
      developer: gameInfo.developer,
      iconUrl: gameInfo.iconUrl,
      currentRating: gameInfo.currentRating,
      totalReviews: gameInfo.totalReviews,
    });

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    console.error("Add game error:", error);
    const message = error instanceof Error ? error.message : "Failed to add game";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
