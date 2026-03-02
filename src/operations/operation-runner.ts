import { useOperationStore } from "../stores/useOperationStore";

/**
 * Run a batch operation on rows with concurrency control.
 * Processes rows in chunks, tracks progress, supports cancellation.
 */
export async function runBatchOperation<I extends { _index: number }, T>(
  items: readonly I[],
  processor: (item: I) => Promise<T>,
  options: {
    concurrency?: number;
  } = {},
): Promise<Map<number, T>> {
  const { concurrency = 5 } = options;
  const results = new Map<number, T>();
  const store = useOperationStore.getState();
  let failCount = 0;

  for (let i = 0; i < items.length; i += concurrency) {
    // Check cancellation between batches
    if (useOperationStore.getState().isCancelled) break;

    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map((item) => processor(item)),
    );

    chunkResults.forEach((result, j) => {
      const item = chunk[j];
      if (!item) return;
      if (result.status === "fulfilled") {
        results.set(item._index, result.value);
      } else {
        failCount++;
        console.warn(
          `Operation failed for row ${item._index}:`,
          result.reason,
        );
      }
    });

    store.incrementProgress(chunk.length);
  }

  return results;
}
