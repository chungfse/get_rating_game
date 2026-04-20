import { NextResponse } from "next/server";
import { getGroups } from "@/lib/db/groups";

export async function GET(
  _request: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const groups = getGroups(params.gameId);
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Get groups error:", error);
    return NextResponse.json({ error: "Failed to get groups" }, { status: 500 });
  }
}
