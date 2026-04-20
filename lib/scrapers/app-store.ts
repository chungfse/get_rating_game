import * as store from "@perttu/app-store-scraper";
import type { ScrapedGame, ScrapedReview, FetchReviewsOptions } from "./types";
import { sleep, withRetry } from "./utils";

const PAGE_SIZE = 100; // reviews per page
const MAX_IOS_REVIEWS = 500; // Apple RSS API hard cap
const DELAY_BETWEEN_PAGES = 500; // ms

/**
 * Fetch game info from App Store
 */
export async function fetchGameInfo(appId: string): Promise<ScrapedGame> {
  const id = parseInt(appId, 10);
  if (isNaN(id)) throw new Error(`Invalid App Store ID: ${appId}. Must be numeric.`);

  const result = await withRetry(() => store.app({ id }));

  return {
    appId,
    platform: "ios",
    name: result.title || appId,
    developer: result.developer || "",
    iconUrl: result.icon || "",
    currentRating: result.score || 0,
    totalReviews: result.reviews || 0,
  };
}

/**
 * Fetch reviews from App Store
 */
export async function fetchReviews(
  appId: string,
  opts: FetchReviewsOptions
): Promise<ScrapedReview[]> {
  const id = parseInt(appId, 10);
  if (isNaN(id)) throw new Error(`Invalid App Store ID: ${appId}. Must be numeric.`);

  const allReviews: ScrapedReview[] = [];
  const limit = Math.min(opts.limit || 500, MAX_IOS_REVIEWS);
  let page = 1;
  const maxPages = Math.ceil(limit / PAGE_SIZE);

  while (allReviews.length < limit && page <= maxPages) {
    const batch = await withRetry(() =>
      store.reviews({
        id,
        sort: store.sort.RECENT,
        page,
      })
    );

    if (!batch || batch.length === 0) break;

    for (const r of batch) {
      const reviewDate = r.updated
        ? new Date(r.updated).toISOString()
        : new Date().toISOString();

      // Skip reviews before afterDate filter
      if (opts.afterDate && reviewDate < opts.afterDate) continue;

      // Skip reviews that don't match version filter
      if (opts.version && r.version && !r.version.startsWith(opts.version)) continue;

      const review: ScrapedReview = {
        id: r.id ? String(r.id) : `ios_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        score: r.score || 1,
        userName: r.userName || "Anonymous",
        title: r.title || undefined,
        text: r.text || "",
        date: reviewDate,
        version: r.version || undefined,
        device: undefined, // App Store doesn't provide device info
        thumbsUp: 0,
      };

      allReviews.push(review);
      if (allReviews.length >= limit) break;
    }

    // Update progress
    opts.onProgress?.(allReviews.length, limit);

    page++;

    // Delay between pages
    if (page <= maxPages) {
      await sleep(DELAY_BETWEEN_PAGES);
    }
  }

  return allReviews;
}
