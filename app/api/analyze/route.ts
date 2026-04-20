import { NextResponse } from "next/server";
import { runIssueExtraction } from "@/lib/issue-extractor";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId } = body as { gameId: string };

    if (!gameId) {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 });
    }

    const issues = await runIssueExtraction(gameId);

    return NextResponse.json({ issues });
  } catch (error) {
    console.error("Analyze error:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze reviews";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
