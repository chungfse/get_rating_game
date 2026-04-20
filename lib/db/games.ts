import { getDb } from "@/lib/db";
import type { Game, Platform } from "@/types";
import { randomUUID } from "crypto";

export function getAllGames(): Game[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, app_id, platform, name, developer, icon_url, current_rating, total_reviews, added_at, last_fetched_at
       FROM games ORDER BY added_at DESC`
    )
    .all() as Array<{
    id: string;
    app_id: string;
    platform: Platform;
    name: string;
    developer: string;
    icon_url: string;
    current_rating: number;
    total_reviews: number;
    added_at: string;
    last_fetched_at: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    appId: r.app_id,
    platform: r.platform,
    name: r.name,
    developer: r.developer,
    iconUrl: r.icon_url,
    currentRating: r.current_rating,
    totalReviews: r.total_reviews,
    addedAt: r.added_at,
    lastFetchedAt: r.last_fetched_at,
  }));
}

export function getGame(id: string): Game | null {
  const db = getDb();
  const r = db.prepare("SELECT * FROM games WHERE id = ?").get(id) as
    | {
        id: string;
        app_id: string;
        platform: Platform;
        name: string;
        developer: string;
        icon_url: string;
        current_rating: number;
        total_reviews: number;
        added_at: string;
        last_fetched_at: string | null;
      }
    | undefined;

  if (!r) return null;
  return {
    id: r.id,
    appId: r.app_id,
    platform: r.platform,
    name: r.name,
    developer: r.developer,
    iconUrl: r.icon_url,
    currentRating: r.current_rating,
    totalReviews: r.total_reviews,
    addedAt: r.added_at,
    lastFetchedAt: r.last_fetched_at,
  };
}

export function insertGame(game: Omit<Game, "id" | "addedAt" | "lastFetchedAt">): Game {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO games (id, app_id, platform, name, developer, icon_url, current_rating, total_reviews, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, game.appId, game.platform, game.name, game.developer, game.iconUrl, game.currentRating, game.totalReviews, now);

  return {
    ...game,
    id,
    addedAt: now,
    lastFetchedAt: null,
  };
}

export function updateLastFetchedAt(id: string, value?: string | null): void {
  const db = getDb();
  if (value === null) {
    db.prepare("UPDATE games SET last_fetched_at = NULL WHERE id = ?").run(id);
  } else {
    db.prepare("UPDATE games SET last_fetched_at = datetime('now') WHERE id = ?").run(id);
  }
}

export function deleteGame(id: string): void {
  const db = getDb();
  // CASCADE will delete related reviews and topic_groups
  db.prepare("DELETE FROM games WHERE id = ?").run(id);
}
