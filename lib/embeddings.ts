import { getOpenAIClient } from "@/lib/openai";
import { getDb } from "@/lib/db";

const EMBEDDING_MODEL = "text-embedding-3-small"; // $0.02/1M tokens, 1536 dimensions
const BATCH_SIZE = 100; // OpenAI allows up to 2048 inputs per request

/**
 * Generate embeddings for reviews that don't have one yet.
 * Stores as compact Float32Array BLOB in SQLite (~6KB per review).
 * Cost: ~$0.001 for 500 reviews.
 */
export async function generateEmbeddings(gameId: string): Promise<number> {
  const db = getDb();
  const client = getOpenAIClient();

  // Get reviews without embeddings
  const rows = db
    .prepare(
      "SELECT id, text, title FROM reviews WHERE game_id = ? AND embedding IS NULL AND LENGTH(TRIM(text)) >= 15"
    )
    .all(gameId) as Array<{ id: string; text: string; title: string | null }>;

  if (rows.length === 0) return 0;

  let embedded = 0;

  // Process in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    // Combine title + text for richer embedding
    const inputs = batch.map((r) => {
      const combined = r.title ? `${r.title}. ${r.text}` : r.text;
      return combined.length > 500 ? combined.slice(0, 500) : combined;
    });

    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: inputs,
    });

    // Store embeddings as binary blobs
    const stmt = db.prepare("UPDATE reviews SET embedding = ? WHERE id = ?");
    const updateMany = db.transaction(() => {
      for (let j = 0; j < batch.length; j++) {
        const vector = response.data[j].embedding;
        const buffer = float32ArrayToBuffer(vector);
        stmt.run(buffer, batch[j].id);
      }
    });
    updateMany();

    embedded += batch.length;
  }

  console.log(`[Embeddings] Generated ${embedded} embeddings for game ${gameId}`);
  return embedded;
}

/**
 * Get embedding for a search query.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });
  return response.data[0].embedding;
}

/**
 * Search reviews by vector similarity.
 * Returns review IDs sorted by cosine similarity.
 */
export function vectorSearch(
  gameId: string,
  queryVector: number[],
  threshold: number = 0.3,
  limit: number = 50
): Array<{ reviewId: string; similarity: number }> {
  const db = getDb();

  const rows = db
    .prepare("SELECT id, embedding FROM reviews WHERE game_id = ? AND embedding IS NOT NULL")
    .all(gameId) as Array<{ id: string; embedding: Buffer }>;

  const results: Array<{ reviewId: string; similarity: number }> = [];

  for (const row of rows) {
    const reviewVector = bufferToFloat32Array(row.embedding);
    const sim = cosineSimilarity(queryVector, reviewVector);

    if (sim >= threshold) {
      results.push({ reviewId: row.id, similarity: sim });
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results.slice(0, limit);
}

// ═══ Utility functions ═══

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function float32ArrayToBuffer(arr: number[]): Buffer {
  const float32 = new Float32Array(arr);
  return Buffer.from(float32.buffer);
}

function bufferToFloat32Array(buf: Buffer): number[] {
  const float32 = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return Array.from(float32);
}
