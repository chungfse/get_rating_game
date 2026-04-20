import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "app.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('android', 'ios')),
      name TEXT NOT NULL,
      developer TEXT NOT NULL DEFAULT '',
      icon_url TEXT NOT NULL DEFAULT '',
      current_rating REAL NOT NULL DEFAULT 0,
      total_reviews INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_fetched_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
      user_name TEXT NOT NULL DEFAULT '',
      title TEXT,
      text TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      version TEXT,
      device TEXT,
      thumbs_up INTEGER DEFAULT 0,
      group_id TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topic_groups (
      id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      label TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (id, game_id),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS issues (
      id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      label TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'game_design',
      severity TEXT NOT NULL DEFAULT 'medium',
      frequency INTEGER NOT NULL DEFAULT 0,
      sentiment REAL NOT NULL DEFAULT -0.5,
      actionable_insight TEXT,
      sample_quotes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (id, game_id),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_issues (
      review_id TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      PRIMARY KEY (review_id, issue_id),
      FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_game_id ON reviews(game_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_group_id ON reviews(group_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_score ON reviews(score);
    CREATE INDEX IF NOT EXISTS idx_topic_groups_game_id ON topic_groups(game_id);
    CREATE INDEX IF NOT EXISTS idx_issues_game_id ON issues(game_id);
    CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
    CREATE INDEX IF NOT EXISTS idx_review_issues_issue ON review_issues(issue_id, game_id);
    CREATE INDEX IF NOT EXISTS idx_review_issues_review ON review_issues(review_id);
  `);

  // Migration: add embedding column if not exists
  try {
    db.prepare("SELECT embedding FROM reviews LIMIT 1").get();
  } catch {
    db.prepare("ALTER TABLE reviews ADD COLUMN embedding BLOB").run();
    console.log("[DB] Added embedding column to reviews table");
  }

  // Auto-cleanup on startup: remove reviews older than 90 days
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoff = cutoffDate.toISOString();

    const ri = db.prepare(
      `DELETE FROM review_issues WHERE review_id IN (SELECT id FROM reviews WHERE fetched_at < ?)`
    ).run(cutoff);
    const rv = db.prepare("DELETE FROM reviews WHERE fetched_at < ?").run(cutoff);

    if (rv.changes > 0) {
      console.log(`[DB] Auto-cleanup: removed ${rv.changes} reviews, ${ri.changes} associations older than 90 days`);
      db.pragma("wal_checkpoint(TRUNCATE)");
    }
  } catch {
    // Cleanup is best-effort, don't block startup
  }

  return db;
}
