import { getDb } from "@/lib/db";
import type { TopicGroup } from "@/types";

export function getGroups(gameId: string): TopicGroup[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, game_id, label, count, created_at
       FROM topic_groups WHERE game_id = ? ORDER BY count DESC`
    )
    .all(gameId) as Array<{
    id: string;
    game_id: string;
    label: string;
    count: number;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    gameId: r.game_id,
    label: r.label,
    count: r.count,
    createdAt: r.created_at,
  }));
}

export function upsertGroup(group: {
  id: string;
  gameId: string;
  label: string;
  count: number;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO topic_groups (id, game_id, label, count, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id, game_id) DO UPDATE SET
       label = excluded.label,
       count = excluded.count`
  ).run(group.id, group.gameId, group.label, group.count);
}

export function upsertGroups(
  groups: Array<{ id: string; gameId: string; label: string; count: number }>
): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO topic_groups (id, game_id, label, count, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id, game_id) DO UPDATE SET
       label = excluded.label,
       count = excluded.count`
  );

  const upsertMany = db.transaction(
    (items: typeof groups) => {
      for (const g of items) {
        stmt.run(g.id, g.gameId, g.label, g.count);
      }
    }
  );

  upsertMany(groups);
}

export function deleteGroups(gameId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM topic_groups WHERE game_id = ?").run(gameId);
}
