// ─── Core Types ─────────────────────────────────────────────

export type Platform = "android" | "ios";

export interface Game {
  id: string;
  appId: string;
  platform: Platform;
  name: string;
  developer: string;
  iconUrl: string;
  currentRating: number;
  totalReviews: number;
  addedAt: string;
  lastFetchedAt: string | null;
}

export interface Review {
  id: string;
  gameId: string;
  score: number; // 1–5
  userName: string;
  title?: string;
  text: string;
  date: string;
  version?: string;
  device?: string; // device model name
  thumbsUp?: number;
  groupId: string | null; // null = not yet clustered
  fetchedAt: string;
}

export interface TopicGroup {
  id: string;
  gameId: string;
  label: string;
  count: number;
  createdAt: string;
}

// ─── AI Types ───────────────────────────────────────────────

export interface AIClusterResponse {
  groups: { id: string; label: string; count: number }[];
  assignments: { reviewId: string; groupId: string }[];
}

export interface AIIncrementalResponse {
  newGroups: { id: string; label: string }[];
  assignments: { reviewId: string; groupId: string }[];
}

// ─── Issue Extraction Types ─────────────────────────────────

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueCategory =
  | 'crash_bug'
  | 'performance'
  | 'monetization'
  | 'ads'
  | 'game_design'
  | 'ux_ui'
  | 'content'
  | 'multiplayer'
  | 'account'
  | 'update';

export interface Issue {
  id: string;
  gameId: string;
  label: string;
  category: IssueCategory;
  severity: IssueSeverity;
  frequency: number;
  sentiment: number;
  actionableInsight: string;
  sampleQuotes: string[];
  createdAt: string;
}

export interface AIIssueExtractionResponse {
  issues: {
    id: string;
    label: string;
    category: string;
    severity: string;
    sentiment: number;
    actionable_insight: string;
    sample_quotes: string[];
  }[];
  review_issues: { reviewId: string; issueIds: string[] }[];
}

// ─── API Request / Response Types ───────────────────────────

export interface PreviewRequest {
  appId: string;
  platform: Platform;
}

export interface AddGameRequest {
  appId: string;
  platform: Platform;
}

export interface FetchReviewsRequest {
  gameId: string;
  limit?: number;
  afterDate?: string;
  version?: string;
}

export interface AnalyzeRequest {
  gameId: string;
}

export interface ReviewFilters {
  gameId: string;
  stars?: number[];
  groupId?: string;
  reviewIds?: string[];
  page?: number;
  sort?: "newest" | "oldest" | "rating_asc" | "rating_desc";
}

// ─── Frontend State Types ───────────────────────────────────

export interface FetchProgress {
  fetched: number;
  total: number;
  status: "idle" | "fetching" | "done" | "error";
  message?: string;
}

export interface AnalyzeProgress {
  status: "idle" | "analyzing" | "done" | "error";
  message?: string;
}
