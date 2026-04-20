import { NextResponse } from "next/server";
import { scrapeGameInfo } from "@/lib/scrapers";
import type { Platform } from "@/types";

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

    if (platform !== "android" && platform !== "ios") {
      return NextResponse.json(
        { error: "platform must be 'android' or 'ios'" },
        { status: 400 }
      );
    }

    const gameInfo = await scrapeGameInfo(appId.trim(), platform);

    return NextResponse.json(gameInfo);
  } catch (error) {
    console.error("Preview error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch game preview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
