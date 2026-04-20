import { getOpenAIClient } from "@/lib/openai";
import type { Review } from "@/types";

const MODEL = "gpt-4o-mini";

interface SearchResult {
  reviewId: string;
  relevance: number;
  reason: string;
}

/**
 * GPT Re-rank: Given candidate reviews from vector search,
 * use GPT to reason about which are ACTUALLY relevant.
 * Much cheaper than full GPT search (30 reviews vs 500).
 */
export async function reRankWithGPT(
  candidates: Review[],
  query: string
): Promise<SearchResult[]> {
  if (candidates.length === 0) return [];

  const client = getOpenAIClient();

  // Send compact review data to GPT
  const reviewsData = candidates.map((r) => ({
    id: r.id,
    text: r.text.length > 250 ? r.text.slice(0, 250) + "…" : r.text,
  }));

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Bạn là công cụ đánh giá mức độ liên quan của review game.
Nhiệm vụ: Với mỗi review, đánh giá xem nó có THỰC SỰ liên quan đến query không.
Hiểu NGỮ NGHĨA — "chơi rất khó" liên quan đến "gameplay", "giật lag" liên quan đến "performance".
CHỈ giữ reviews thực sự liên quan. Loại bỏ false positives.
Trả lời bằng JSON.`,
      },
      {
        role: "user",
        content: `Query: "${query}"

Đánh giá từng review. CHỈ trả về reviews THỰC SỰ liên quan (relevance >= 0.5).

JSON: {"results": [{"id": "...", "relevance": 0.9, "reason": "lý do ngắn ~10 từ"}]}

Reviews:
${JSON.stringify(reviewsData)}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as {
      results?: Array<{ id: string; relevance: number; reason: string }>;
    };

    if (!parsed.results) return [];

    return parsed.results.map((r) => ({
      reviewId: r.id,
      relevance: r.relevance,
      reason: r.reason,
    }));
  } catch {
    console.error("Failed to parse GPT re-rank response");
    return [];
  }
}

/**
 * Legacy: Full GPT semantic search (used as fallback when no embeddings).
 * Sends ALL reviews to GPT — more expensive but works without embeddings.
 */
export async function searchReviewsByAI(
  reviews: Review[],
  query: string
): Promise<SearchResult[]> {
  const client = getOpenAIClient();

  // Deduplicate similar reviews
  const seen = new Map<string, string[]>();
  const uniqueReviews: Array<{ id: string; text: string }> = [];

  for (const r of reviews) {
    const textKey = r.text.trim().toLowerCase().slice(0, 80);
    if (seen.has(textKey)) {
      seen.get(textKey)!.push(r.id);
    } else {
      seen.set(textKey, [r.id]);
      uniqueReviews.push({
        id: r.id,
        text: r.text.length > 200 ? r.text.slice(0, 200) + "…" : r.text,
      });
    }
  }

  const BATCH_SIZE = 150;
  const batches = chunk(uniqueReviews, BATCH_SIZE);
  const allResults: SearchResult[] = [];

  for (const batch of batches) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `Tìm reviews liên quan đến query. Hiểu NGỮ NGHĨA. Trả lời JSON.`,
        },
        {
          role: "user",
          content: `Query: "${query}"

CHỈ trả reviews liên quan (relevance >= 0.5).

JSON: {"r": [{"id": "...", "s": 0.9, "w": "lý do ngắn"}]}

Reviews:
${JSON.stringify(batch)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) continue;

    try {
      const parsed = JSON.parse(content) as {
        r?: Array<{ id: string; s: number; w: string }>;
        results?: SearchResult[];
      };

      const items = parsed.r || parsed.results;
      if (items) {
        for (const item of items) {
          const reviewId = "reviewId" in item ? (item as SearchResult).reviewId : item.id;
          const relevance = "relevance" in item ? (item as SearchResult).relevance : (item as { s: number }).s;
          const reason = "reason" in item ? (item as SearchResult).reason : (item as { w: string }).w;

          const textKey = reviews.find((r) => r.id === reviewId)?.text.trim().toLowerCase().slice(0, 80);
          const duplicateIds = textKey ? seen.get(textKey) || [reviewId] : [reviewId];

          for (const dupeId of duplicateIds) {
            allResults.push({ reviewId: dupeId, relevance, reason });
          }
        }
      }
    } catch {
      console.error("Failed to parse AI search response");
    }
  }

  allResults.sort((a, b) => b.relevance - a.relevance);
  return allResults;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
