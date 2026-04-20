/**
 * Sleep for a number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Random delay between min and max milliseconds
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return sleep(ms);
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number[] = [2000, 5000]
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}`
      );

      if (attempt < maxRetries) {
        const delay = backoffMs[Math.min(attempt, backoffMs.length - 1)];
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
