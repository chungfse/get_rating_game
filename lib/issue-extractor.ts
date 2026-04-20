import { getUnanalyzedReviews } from "@/lib/db/reviews";
import { getIssues, upsertIssues, deleteIssues, setReviewIssues, clearReviewIssues, getIssueFrequencies } from "@/lib/db/issues";
import { getGame } from "@/lib/db/games";
import { extractIssues, extractIssuesIncremental } from "@/lib/analyzer";
import { generateEmbeddings } from "@/lib/embeddings";
import type { Issue } from "@/types";

const BATCH_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Run issue extraction on a game's unanalyzed reviews.
 * - First time: extract fresh issues
 * - Subsequent: incremental extraction with existing issues
 * - Handles batching to avoid API timeouts
 */
export async function runIssueExtraction(
  gameId: string
): Promise<Issue[]> {
  const game = getGame(gameId);
  if (!game) throw new Error(`Game not found: ${gameId}`);

  const unanalyzed = getUnanalyzedReviews(gameId);

  if (unanalyzed.length === 0) {
    return getIssues(gameId);
  }

  // Filter out junk reviews — too short or emoji-only (waste tokens)
  const MIN_TEXT_LENGTH = 15;
  const useful = unanalyzed.filter((r) => {
    const cleanText = r.text.replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu, "").trim();
    return cleanText.length >= MIN_TEXT_LENGTH;
  });
  const junk = unanalyzed.filter((r) => !useful.includes(r));

  // Mark junk reviews as analyzed immediately (skip AI)
  if (junk.length > 0) {
    markReviewsAsAnalyzed(junk.map((r) => r.id));
    console.log(`[AI] Skipped ${junk.length} junk reviews (< ${MIN_TEXT_LENGTH} chars)`);
  }

  if (useful.length === 0) {
    return getIssues(gameId);
  }

  let existingIssues = getIssues(gameId);
  const batches = chunk(useful, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    if (existingIssues.length === 0 && i === 0) {
      // First time — initial extraction
      const result = await extractIssues(batch, game.name);

      // Save issues to DB
      const issuesToSave = result.issues.map((iss) => ({
        id: iss.id,
        gameId,
        label: iss.label,
        category: iss.category,
        severity: iss.severity,
        frequency: 0, // will be recalculated
        sentiment: iss.sentiment,
        actionableInsight: iss.actionable_insight,
        sampleQuotes: iss.sample_quotes || [],
      }));
      upsertIssues(issuesToSave);

      // Save review-issue associations
      const associations: Array<{ reviewId: string; issueId: string; gameId: string }> = [];
      for (const ri of result.review_issues) {
        for (const issueId of ri.issueIds) {
          associations.push({ reviewId: ri.reviewId, issueId, gameId });
        }
      }
      setReviewIssues(associations);

      // Mark reviews as analyzed by setting a dummy group_id
      // (so they won't be picked up as unanalyzed again)
      markReviewsAsAnalyzed(batch.map((r) => r.id));

      existingIssues = getIssues(gameId);
    } else {
      // Incremental extraction
      const currentIssues = i > 0 ? getIssues(gameId) : existingIssues;
      const result = await extractIssuesIncremental(batch, game.name, currentIssues);

      // Save NEW issues
      if (result.issues && result.issues.length > 0) {
        const newIssuesToSave = result.issues.map((iss) => ({
          id: iss.id,
          gameId,
          label: iss.label,
          category: iss.category,
          severity: iss.severity,
          frequency: 0,
          sentiment: iss.sentiment,
          actionableInsight: iss.actionable_insight,
          sampleQuotes: iss.sample_quotes || [],
        }));
        upsertIssues(newIssuesToSave);
      }

      // Save review-issue associations
      const associations: Array<{ reviewId: string; issueId: string; gameId: string }> = [];
      for (const ri of result.review_issues) {
        for (const issueId of ri.issueIds) {
          associations.push({ reviewId: ri.reviewId, issueId, gameId });
        }
      }
      setReviewIssues(associations);

      markReviewsAsAnalyzed(batch.map((r) => r.id));
    }
  }

  // Recalculate all issue frequencies from actual review_issues data
  const frequencies = getIssueFrequencies(gameId);
  const allIssues = getIssues(gameId);

  const updatedIssues = allIssues.map((iss) => ({
    id: iss.id,
    gameId,
    label: iss.label,
    category: iss.category,
    severity: iss.severity,
    frequency: frequencies[iss.id] || 0,
    sentiment: iss.sentiment,
    actionableInsight: iss.actionableInsight,
    sampleQuotes: iss.sampleQuotes,
  }));

  // Remove issues with 0 frequency
  const activeIssues = updatedIssues.filter((i) => i.frequency > 0);
  upsertIssues(activeIssues);

  // Generate vector embeddings for new reviews (for semantic search)
  try {
    await generateEmbeddings(gameId);
  } catch (err) {
    console.error("[Embeddings] Failed to generate:", err);
    // Non-blocking — search still works via GPT fallback
  }

  return getIssues(gameId);
}

/**
 * Mark reviews as "analyzed" by setting group_id to a sentinel value.
 * This prevents them from being picked up by getUnanalyzedReviews().
 */
function markReviewsAsAnalyzed(reviewIds: string[]): void {
  // Import getDb directly to avoid circular dependency
  const { getDb } = require("@/lib/db");
  const db = getDb();
  const stmt = db.prepare("UPDATE reviews SET group_id = '__analyzed__' WHERE id = ? AND group_id IS NULL");
  const updateMany = db.transaction((ids: string[]) => {
    for (const id of ids) {
      stmt.run(id);
    }
  });
  updateMany(reviewIds);
}
