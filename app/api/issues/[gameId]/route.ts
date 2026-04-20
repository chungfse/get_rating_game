import { NextResponse } from "next/server";
import { getIssues } from "@/lib/db/issues";

export async function GET(
  _request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const issues = getIssues(params.gameId);
    return NextResponse.json(issues);
  } catch (error) {
    console.error("Get issues error:", error);
    return NextResponse.json({ error: "Failed to get issues" }, { status: 500 });
  }
}
