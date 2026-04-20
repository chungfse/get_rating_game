import gplay from "google-play-scraper";
import type { ScrapedGame, ScrapedReview, FetchReviewsOptions } from "./types";
import { randomDelay, withRetry } from "./utils";

const BATCH_SIZE = 199; // library max per request
const THROTTLE = 10; // google-play-scraper throttle param

/**
 * Fetch game info from Google Play
 */
export async function fetchGameInfo(appId: string): Promise<ScrapedGame> {
  const result = await withRetry(() => gplay.app({ appId }));

  return {
    appId,
    platform: "android",
    name: result.title || appId,
    developer: result.developer || "",
    iconUrl: result.icon || "",
    currentRating: result.score || 0,
    totalReviews: result.reviews || 0,
  };
}

/**
 * Fetch reviews from Google Play with anti-rate-limit
 */
export async function fetchReviews(
  appId: string,
  opts: FetchReviewsOptions
): Promise<ScrapedReview[]> {
  const allReviews: ScrapedReview[] = [];
  let nextToken: string | undefined;
  const limit = Math.min(opts.limit || 500, 1000);

  while (allReviews.length < limit) {
    const remaining = limit - allReviews.length;
    const num = Math.min(BATCH_SIZE, remaining);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batch: any = await withRetry(async () => {
      const result = await gplay.reviews({
        appId,
        sort: gplay.sort.NEWEST,
        num,
        throttle: THROTTLE,
        nextPaginationToken: nextToken,
      });
      return result;
    });

    const items = batch.data || batch;
    if (!items || items.length === 0) break;

    for (const r of items) {
      const reviewDate = r.date ? new Date(r.date).toISOString() : new Date().toISOString();

      // Skip reviews before afterDate filter
      if (opts.afterDate && reviewDate < opts.afterDate) continue;

      // Skip reviews that don't match version filter
      if (opts.version && r.version && !r.version.startsWith(opts.version)) continue;

      const review: ScrapedReview = {
        id: r.id || `gp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        score: r.score || 1,
        userName: r.userName || "Anonymous",
        title: r.title || undefined,
        text: r.text || "",
        date: reviewDate,
        version: r.version || undefined,
        device: (r as Record<string, unknown>).device as string | undefined,
        thumbsUp: r.thumbsUp || 0,
      };

      allReviews.push(review);
    }

    // Update progress
    opts.onProgress?.(allReviews.length, limit);

    // Check pagination token
    nextToken = batch.nextPaginationToken as string | undefined;
    if (!nextToken) break;

    // Anti-rate-limit: random delay between batches
    await randomDelay(300, 800);
  }

  return allReviews;
}
