import { getDb } from "@/lib/db";

const DEFAULT_RETENTION_DAYS = 90;

/**
 * Auto-cleanup: delete reviews older than retention period.
 * Also cleans up orphaned issues and review_issues.
 * Returns number of deleted reviews.
 */
export function cleanupOldReviews(retentionDays: number = DEFAULT_RETENTION_DAYS): number {
  const db = getDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoff = cutoffDate.toISOString();

  // Delete old review_issues first (foreign key)
  db.prepare(
    `DELETE FROM review_issues WHERE review_id IN (
       SELECT id FROM reviews WHERE fetched_at < ?
     )`
  ).run(cutoff);

  // Delete old reviews
  const result = db.prepare("DELETE FROM reviews WHERE fetched_at < ?").run(cutoff);

  // Clean up issues with 0 reviews
  db.prepare(
    `DELETE FROM issues WHERE (id, game_id) NOT IN (
       SELECT DISTINCT issue_id, game_id FROM review_issues
     ) AND game_id IN (SELECT DISTINCT game_id FROM games)`
  ).run();

  // Reclaim disk space
  db.pragma("wal_checkpoint(TRUNCATE)");

  return result.changes;
}

/**
 * Delete all reviews (and related data) for a specific game.
 */
export function clearGameReviews(gameId: string): number {
  const db = getDb();

  db.prepare("DELETE FROM review_issues WHERE game_id = ?").run(gameId);
  db.prepare("DELETE FROM issues WHERE game_id = ?").run(gameId);

  const result = db.prepare("DELETE FROM reviews WHERE game_id = ?").run(gameId);

  // Reset group_id references
  db.prepare("DELETE FROM topic_groups WHERE game_id = ?").run(gameId);

  return result.changes;
}

/**
 * Get database stats
 */
export function getDbStats(): {
  totalReviews: number;
  totalGames: number;
  dbSizeBytes: number;
  oldestReview: string | null;
} {
  const db = getDb();

  const reviews = db.prepare("SELECT COUNT(*) as cnt FROM reviews").get() as { cnt: number };
  const games = db.prepare("SELECT COUNT(*) as cnt FROM games").get() as { cnt: number };
  const oldest = db.prepare("SELECT MIN(fetched_at) as dt FROM reviews").get() as { dt: string | null };

  // Get page count * page size for approximate DB size
  const pageCount = db.pragma("page_count") as Array<{ page_count: number }>;
  const pageSize = db.pragma("page_size") as Array<{ page_size: number }>;
  const dbSize = (pageCount[0]?.page_count || 0) * (pageSize[0]?.page_size || 4096);

  return {
    totalReviews: reviews.cnt,
    totalGames: games.cnt,
    dbSizeBytes: dbSize,
    oldestReview: oldest.dt,
  };
}
