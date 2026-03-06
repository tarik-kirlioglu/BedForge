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
 * Check if a buffer at the given offset contains a BGZF block header.
 * BGZF header: 1f 8b 08 04 ... XLEN=6 SI1=42('B') SI2=43('C') SLEN=2 BSIZE(u16le)
 * Returns the total block size (BSIZE+1) or 0 if not a valid BGZF block.
 */
function readBgzfBlockSize(data: Uint8Array, pos: number): number {
  if (pos + 18 > data.byteLength) return 0;
  // Check gzip magic, CM=8 (deflate), FLG bit 2 set (FEXTRA)
  if (data[pos]! !== 0x1f || data[pos + 1]! !== 0x8b) return 0;
  if (data[pos + 2]! !== 0x08) return 0;
  if ((data[pos + 3]! & 0x04) === 0) return 0;
  // XLEN at offset 10 (little-endian)
  const xlen = data[pos + 10]! | (data[pos + 11]! << 8);
  // Scan extra fields for the BC subfield
  const extraEnd = pos + 12 + xlen;
  if (extraEnd > data.byteLength) return 0;
  let i = pos + 12;
  while (i + 4 <= extraEnd) {
    const si1 = data[i]!;
    const si2 = data[i + 1]!;
    const slen = data[i + 2]! | (data[i + 3]! << 8);
    if (si1 === 0x42 && si2 === 0x43 && slen === 2) {
      // Found BC subfield — BSIZE is at i+4 (u16 little-endian)
      if (i + 6 > data.byteLength) return 0;
      const bsize = data[i + 4]! | (data[i + 5]! << 8);
      return bsize + 1; // total block size
    }
    i += 4 + slen;
  }
  return 0;
}

/**
 * Decompress a single gzip block from a Uint8Array slice.
 */
async function decompressBlock(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("gzip");
  const slice = (data.buffer as ArrayBuffer).slice(data.byteOffset, data.byteOffset + data.byteLength);
  const blob = new Blob([slice]);
  const decompressedStream = blob.stream().pipeThrough(ds);
  const reader = decompressedStream.getReader();

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalBytes += value.byteLength;
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

/**
 * Decompress a gzipped File using the native DecompressionStream API.
 * Supports both standard gzip and BGZF (blocked gzip from bgzip/samtools).
 * Returns the decompressed text content.
 */
export async function decompressGz(file: File): Promise<string> {
  // First, try standard single-stream decompression
  try {
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
  } catch {
    // Standard decompression failed — likely a BGZF file (concatenated gzip blocks).
    // Fall back to block-by-block decompression.
  }

  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  // Verify gzip magic at start
  if (data.byteLength < 2 || data[0] !== 0x1f || data[1] !== 0x8b) {
    throw new Error("File does not appear to be gzip-compressed.");
  }

  // Walk BGZF blocks using the BSIZE field from each block header
  const decompressedChunks: Uint8Array[] = [];
  let totalBytes = 0;
  let pos = 0;

  while (pos < data.byteLength) {
    const blockSize = readBgzfBlockSize(data, pos);
    if (blockSize === 0) {
      // Not a valid BGZF block — treat the rest as a single gzip stream
      const remaining = data.subarray(pos);
      const decompressed = await decompressBlock(remaining);
      if (decompressed.byteLength > 0) {
        decompressedChunks.push(decompressed);
        totalBytes += decompressed.byteLength;
      }
      break;
    }

    const block = data.subarray(pos, pos + blockSize);
    const decompressed = await decompressBlock(block);
    if (decompressed.byteLength > 0) {
      decompressedChunks.push(decompressed);
      totalBytes += decompressed.byteLength;
    }

    if (totalBytes > HARD_SIZE_LIMIT) {
      throw new Error(
        `Decompressed size exceeds ${formatBytes(HARD_SIZE_LIMIT)}. This file is too large for in-browser processing.`,
      );
    }

    pos += blockSize;
  }

  if (totalBytes === 0) {
    throw new Error("Decompression produced no output.");
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of decompressedChunks) {
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
