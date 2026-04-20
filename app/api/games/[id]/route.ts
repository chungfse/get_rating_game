import { NextResponse } from "next/server";
import { deleteGame, getGame } from "@/lib/db/games";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const game = getGame(params.id);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // CASCADE deletes reviews and topic_groups
    deleteGame(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete game error:", error);
    return NextResponse.json({ error: "Failed to delete game" }, { status: 500 });
  }
}
