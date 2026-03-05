/** Size limits for file loading */
export const SOFT_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB
export const HARD_SIZE_LIMIT = 500 * 1024 * 1024; // 500 MB

/**
 * Strip .gz extension to reveal the real filename.
 * e.g. "genes.gff3.gz" → "genes.gff3"
 */
export function stripGzExtension(fileName: string): string {
  if (fileName.toLowerCase().endsWith(".gz")) {
    return fileName.slice(0, -3);
  }
  return fileName;
}

/** Check if a file is gzip-compressed by extension */
export function isGzipped(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".gz");
}

/**
 * Decompress a gzipped File using the native DecompressionStream API.
 * Returns the decompressed text content.
 */
export async function decompressGz(file: File): Promise<string> {
  const ds = new DecompressionStream("gzip");
  const decompressedStream = file.stream().pipeThrough(ds);
  const reader = decompressedStream.getReader();

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalBytes += value.byteLength;

    if (totalBytes > HARD_SIZE_LIMIT) {
      reader.cancel();
      throw new Error(
        `Decompressed size exceeds ${formatBytes(HARD_SIZE_LIMIT)}. This file is too large for in-browser processing.`,
      );
    }
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
