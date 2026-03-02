/**
 * Token-bucket rate limiter for Ensembl REST API.
 * Stays under the 15 req/s limit with a safety margin.
 */

const MAX_TOKENS = 14;
const REFILL_RATE = MAX_TOKENS / 1000; // tokens per ms

let tokens = MAX_TOKENS;
let lastRefill = Date.now();
const queue: Array<() => void> = [];

function refill(): void {
  const now = Date.now();
  const elapsed = now - lastRefill;
  tokens = Math.min(MAX_TOKENS, tokens + elapsed * REFILL_RATE);
  lastRefill = now;
}

function processQueue(): void {
  refill();
  while (queue.length > 0 && tokens >= 1) {
    tokens -= 1;
    const resolve = queue.shift();
    resolve?.();
  }
  if (queue.length > 0) {
    setTimeout(processQueue, Math.ceil(1000 / MAX_TOKENS));
  }
}

/** Acquire a token before making a request. Waits if rate limit is hit. */
export function acquireToken(): Promise<void> {
  refill();
  if (tokens >= 1) {
    tokens -= 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    queue.push(resolve);
    setTimeout(processQueue, Math.ceil(1000 / MAX_TOKENS));
  });
}
