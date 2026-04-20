import { getDb } from "@/lib/db";
import type { Review, ReviewFilters } from "@/types";

const PAGE_SIZE = 100;

interface ReviewRow {
  id: string;
  game_id: string;
  score: number;
  user_name: string;
  title: string | null;
  text: string;
  date: string;
  version: string | null;
  device: string | null;
  thumbs_up: number;
  group_id: string | null;
  fetched_at: string;
}

function rowToReview(r: ReviewRow): Review {
  return {
    id: r.id,
    gameId: r.game_id,
    score: r.score,
    userName: r.user_name,
    title: r.title ?? undefined,
    text: r.text,
    date: r.date,
    version: r.version ?? undefined,
    device: r.device ?? undefined,
    thumbsUp: r.thumbs_up,
    groupId: r.group_id,
    fetchedAt: r.fetched_at,
  };
}

export function getReviews(filters: ReviewFilters): { reviews: Review[]; total: number } {
  const db = getDb();

  const conditions: string[] = ["game_id = ?"];
  const params: (string | number)[] = [filters.gameId];

  // Star filter
  if (filters.stars && filters.stars.length > 0 && filters.stars.length < 5) {
    const placeholders = filters.stars.map(() => "?").join(",");
    conditions.push(`score IN (${placeholders})`);
    params.push(...filters.stars);
  }

  // Group filter
  if (filters.groupId) {
    conditions.push("group_id = ?");
    params.push(filters.groupId);
  }

  // Review IDs filter (for issue-based filtering)
  if (filters.reviewIds && filters.reviewIds.length > 0) {
    const placeholders = filters.reviewIds.map(() => "?").join(",");
    conditions.push(`id IN (${placeholders})`);
    params.push(...filters.reviewIds);
  }

  const where = conditions.join(" AND ");

  // Get total count
  const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM reviews WHERE ${where}`).get(...params) as { cnt: number };
  const total = countRow.cnt;

  // Sort
  let orderBy = "date DESC"; // default: newest
  switch (filters.sort) {
    case "oldest":
      orderBy = "date ASC";
      break;
    case "rating_asc":
      orderBy = "score ASC, date DESC";
      break;
    case "rating_desc":
      orderBy = "score DESC, date DESC";
      break;
  }

  // Pagination
  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  const rows = db
    .prepare(`SELECT * FROM reviews WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, PAGE_SIZE, offset) as ReviewRow[];

  return {
    reviews: rows.map(rowToReview),
    total,
  };
}

export function insertReviews(reviews: Omit<Review, "fetchedAt">[]): number {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO reviews (id, game_id, score, user_name, title, text, date, version, device, thumbs_up, group_id, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let inserted = 0;
  const insertMany = db.transaction((items: typeof reviews) => {
    for (const r of items) {
      const result = stmt.run(
        r.id,
        r.gameId,
        r.score,
        r.userName,
        r.title ?? null,
        r.text,
        r.date,
        r.version ?? null,
        r.device ?? null,
        r.thumbsUp ?? 0,
        r.groupId ?? null,
        now
      );
      if (result.changes > 0) inserted++;
    }
  });

  insertMany(reviews);
  return inserted;
}

export function getUnanalyzedReviews(gameId: string): Review[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM reviews WHERE game_id = ? AND group_id IS NULL ORDER BY date DESC")
    .all(gameId) as ReviewRow[];

  return rows.map(rowToReview);
}

export function updateGroupId(reviewId: string, groupId: string): void {
  const db = getDb();
  db.prepare("UPDATE reviews SET group_id = ? WHERE id = ?").run(groupId, reviewId);
}

export function updateGroupIds(assignments: { reviewId: string; groupId: string }[]): void {
  const db = getDb();
  const stmt = db.prepare("UPDATE reviews SET group_id = ? WHERE id = ?");

  const updateMany = db.transaction((items: typeof assignments) => {
    for (const a of items) {
      stmt.run(a.groupId, a.reviewId);
    }
  });

  updateMany(assignments);
}

export function getReviewCountByGroup(gameId: string): Record<string, number> {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT group_id, COUNT(*) as cnt FROM reviews WHERE game_id = ? AND group_id IS NOT NULL GROUP BY group_id"
    )
    .all(gameId) as Array<{ group_id: string; cnt: number }>;

  const result: Record<string, number> = {};
  for (const r of rows) {
    result[r.group_id] = r.cnt;
  }
  return result;
}

export function getReviewCountByGroupFiltered(
  gameId: string,
  stars?: number[]
): Record<string, number> {
  const db = getDb();

  const conditions: string[] = ["game_id = ?", "group_id IS NOT NULL"];
  const params: (string | number)[] = [gameId];

  if (stars && stars.length > 0 && stars.length < 5) {
    const placeholders = stars.map(() => "?").join(",");
    conditions.push(`score IN (${placeholders})`);
    params.push(...stars);
  }

  const where = conditions.join(" AND ");
  const rows = db
    .prepare(
      `SELECT group_id, COUNT(*) as cnt FROM reviews WHERE ${where} GROUP BY group_id`
    )
    .all(...params) as Array<{ group_id: string; cnt: number }>;

  const result: Record<string, number> = {};
  for (const r of rows) {
    result[r.group_id] = r.cnt;
  }
  return result;
}

export function getReviewCountByStar(gameId: string): Record<number, number> {
  const db = getDb();
  const rows = db
    .prepare("SELECT score, COUNT(*) as cnt FROM reviews WHERE game_id = ? GROUP BY score")
    .all(gameId) as Array<{ score: number; cnt: number }>;

  const result: Record<number, number> = {};
  for (const r of rows) {
    result[r.score] = r.cnt;
  }
  return result;
}
