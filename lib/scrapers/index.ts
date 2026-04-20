import type { Platform } from "@/types";
import type { ScrapedGame, ScrapedReview, FetchReviewsOptions } from "./types";
import * as googlePlay from "./google-play";
import * as appStore from "./app-store";

/**
 * Unified scraper — fetches game info from the appropriate store
 */
export async function scrapeGameInfo(
  appId: string,
  platform: Platform
): Promise<ScrapedGame> {
  if (platform === "android") {
    return googlePlay.fetchGameInfo(appId);
  } else {
    return appStore.fetchGameInfo(appId);
  }
}

/**
 * Unified scraper — fetches reviews from the appropriate store
 */
export async function scrapeReviews(
  appId: string,
  platform: Platform,
  opts: FetchReviewsOptions
): Promise<ScrapedReview[]> {
  if (platform === "android") {
    return googlePlay.fetchReviews(appId, opts);
  } else {
    return appStore.fetchReviews(appId, opts);
  }
}
