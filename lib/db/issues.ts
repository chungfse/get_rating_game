import { getDb } from "@/lib/db";
import type { Issue, IssueSeverity, IssueCategory } from "@/types";

interface IssueRow {
  id: string;
  game_id: string;
  label: string;
  category: string;
  severity: string;
  frequency: number;
  sentiment: number;
  actionable_insight: string | null;
  sample_quotes: string | null;
  created_at: string;
}

function rowToIssue(r: IssueRow): Issue {
  return {
    id: r.id,
    gameId: r.game_id,
    label: r.label,
    category: r.category as IssueCategory,
    severity: r.severity as IssueSeverity,
    frequency: r.frequency,
    sentiment: r.sentiment,
    actionableInsight: r.actionable_insight ?? "",
    sampleQuotes: r.sample_quotes ? JSON.parse(r.sample_quotes) : [],
    createdAt: r.created_at,
  };
}

/** Get all issues for a game, sorted by severity priority then frequency */
export function getIssues(gameId: string): Issue[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM issues WHERE game_id = ?
       ORDER BY
         CASE severity
           WHEN 'critical' THEN 0
           WHEN 'high' THEN 1
           WHEN 'medium' THEN 2
           WHEN 'low' THEN 3
         END,
         frequency DESC`
    )
    .all(gameId) as IssueRow[];

  return rows.map(rowToIssue);
}

/** Upsert issues into database */
export function upsertIssues(
  issues: Array<{
    id: string;
    gameId: string;
    label: string;
    category: string;
    severity: string;
    frequency: number;
    sentiment: number;
    actionableInsight: string;
    sampleQuotes: string[];
  }>
): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO issues (id, game_id, label, category, severity, frequency, sentiment, actionable_insight, sample_quotes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id, game_id) DO UPDATE SET
       label = excluded.label,
       category = excluded.category,
       severity = excluded.severity,
       frequency = excluded.frequency,
       sentiment = excluded.sentiment,
       actionable_insight = excluded.actionable_insight,
       sample_quotes = excluded.sample_quotes`
  );

  const upsertMany = db.transaction((items: typeof issues) => {
    for (const i of items) {
      stmt.run(
        i.id,
        i.gameId,
        i.label,
        i.category,
        i.severity,
        i.frequency,
        i.sentiment,
        i.actionableInsight,
        JSON.stringify(i.sampleQuotes)
      );
    }
  });

  upsertMany(issues);
}

/** Delete all issues and review_issues for a game */
export function deleteIssues(gameId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM review_issues WHERE game_id = ?").run(gameId);
  db.prepare("DELETE FROM issues WHERE game_id = ?").run(gameId);
}

/** Set review-issue associations (many-to-many) */
export function setReviewIssues(
  assignments: Array<{ reviewId: string; issueId: string; gameId: string }>
): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO review_issues (review_id, issue_id, game_id)
     VALUES (?, ?, ?)`
  );

  const insertMany = db.transaction((items: typeof assignments) => {
    for (const a of items) {
      stmt.run(a.reviewId, a.issueId, a.gameId);
    }
  });

  insertMany(assignments);
}

/** Get issue IDs for a specific review */
export function getIssueIdsByReview(reviewId: string): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT issue_id FROM review_issues WHERE review_id = ?")
    .all(reviewId) as Array<{ issue_id: string }>;

  return rows.map((r) => r.issue_id);
}

/** Get issue counts filtered by star ratings (for dynamic filtering) */
export function getIssueCountsFiltered(
  gameId: string,
  stars?: number[]
): Record<string, number> {
  const db = getDb();

  const conditions: string[] = [
    "ri.game_id = ?",
  ];
  const params: (string | number)[] = [gameId];

  if (stars && stars.length > 0 && stars.length < 5) {
    const placeholders = stars.map(() => "?").join(",");
    conditions.push(`r.score IN (${placeholders})`);
    params.push(...stars);
  }

  const where = conditions.join(" AND ");
  const rows = db
    .prepare(
      `SELECT ri.issue_id, COUNT(DISTINCT ri.review_id) as cnt
       FROM review_issues ri
       JOIN reviews r ON r.id = ri.review_id
       WHERE ${where}
       GROUP BY ri.issue_id`
    )
    .all(...params) as Array<{ issue_id: string; cnt: number }>;

  const result: Record<string, number> = {};
  for (const r of rows) {
    result[r.issue_id] = r.cnt;
  }
  return result;
}

/** Get count of reviews per issue (unfiltered) — used after analysis */
export function getIssueFrequencies(gameId: string): Record<string, number> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT issue_id, COUNT(*) as cnt
       FROM review_issues WHERE game_id = ?
       GROUP BY issue_id`
    )
    .all(gameId) as Array<{ issue_id: string; cnt: number }>;

  const result: Record<string, number> = {};
  for (const r of rows) {
    result[r.issue_id] = r.cnt;
  }
  return result;
}

/** Clear review_issues for a specific game (before re-analysis) */
export function clearReviewIssues(gameId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM review_issues WHERE game_id = ?").run(gameId);
}
