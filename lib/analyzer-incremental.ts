import { getUnanalyzedReviews, updateGroupIds, getReviewCountByGroup } from "@/lib/db/reviews";
import { getGroups, upsertGroups } from "@/lib/db/groups";
import { getGame } from "@/lib/db/games";
import { analyzeReviews, analyzeReviewsIncremental } from "@/lib/analyzer";
import type { TopicGroup, Review } from "@/types";

const BATCH_SIZE = 100; // Max reviews per AI call to avoid timeout

/**
 * Split an array into chunks of a given size
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Run incremental analysis on a game:
 * - Gets unanalyzed reviews (group_id = NULL)
 * - Splits into batches of BATCH_SIZE to avoid API timeouts
 * - If no existing groups → initial analysis on first batch, incremental on rest
 * - If existing groups → incremental analysis on all batches
 * - Updates group_ids and topic_groups in DB
 */
export async function runIncrementalAnalysis(
  gameId: string
): Promise<TopicGroup[]> {
  const game = getGame(gameId);
  if (!game) throw new Error(`Game not found: ${gameId}`);

  // Get reviews that haven't been analyzed yet
  const unanalyzed = getUnanalyzedReviews(gameId);

  if (unanalyzed.length === 0) {
    // No new reviews, return existing groups
    return getGroups(gameId);
  }

  let existingGroups = getGroups(gameId);
  const batches = chunk(unanalyzed, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    if (existingGroups.length === 0 && i === 0) {
      // First time analysis — initial clustering on first batch
      const result = await analyzeReviews(batch, game.name);

      // Update review group assignments
      updateGroupIds(result.assignments);

      // Save groups to DB
      const groupsToSave = result.groups.map((g) => ({
        id: g.id,
        gameId,
        label: g.label,
        count: g.count,
      }));
      upsertGroups(groupsToSave);

      // Refresh existing groups for next batches
      existingGroups = getGroups(gameId);
    } else {
      // Incremental analysis — merge with existing groups
      const currentGroups = i > 0 ? getGroups(gameId) : existingGroups;
      const result = await analyzeReviewsIncremental(
        batch,
        game.name,
        currentGroups
      );

      // Update review group assignments
      updateGroupIds(result.assignments);

      // Save NEW groups to DB
      if (result.newGroups && result.newGroups.length > 0) {
        const newGroupsToSave = result.newGroups.map((g) => ({
          id: g.id,
          gameId,
          label: g.label,
          count: 0, // will be recalculated below
        }));
        upsertGroups(newGroupsToSave);
      }
    }
  }

  // Recalculate all group counts from actual review assignments
  const countByGroup = getReviewCountByGroup(gameId);
  const allGroups = getGroups(gameId);

  const updatedGroups = allGroups.map((g) => ({
    id: g.id,
    gameId,
    label: g.label,
    count: countByGroup[g.id] || 0,
  }));

  upsertGroups(updatedGroups);

  return getGroups(gameId);
}
