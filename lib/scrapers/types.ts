import type { Platform } from "@/types";

/**
 * Normalized game info from scrapers
 */
export interface ScrapedGame {
  appId: string;
  platform: Platform;
  name: string;
  developer: string;
  iconUrl: string;
  currentRating: number;
  totalReviews: number;
}

/**
 * Normalized review from scrapers
 */
export interface ScrapedReview {
  id: string;
  score: number; // 1–5
  userName: string;
  title?: string;
  text: string;
  date: string; // ISO date string
  version?: string;
  device?: string;
  thumbsUp?: number;
}

/**
 * Options for fetching reviews
 */
export interface FetchReviewsOptions {
  limit: number; // max reviews to fetch
  afterDate?: string; // ISO date — only fetch reviews after this date
  version?: string; // filter by app version
  onProgress?: (fetched: number, total: number) => void;
}
