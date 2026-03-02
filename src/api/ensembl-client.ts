import { acquireToken } from "./throttle";

const BASE_URL = "https://rest.ensembl.org";
const MAX_RETRIES = 3;

export class EnsemblApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly path: string,
  ) {
    super(`Ensembl API error ${status} for ${path}: ${body}`);
    this.name = "EnsemblApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch from Ensembl REST API with rate limiting and retry on 429 */
export async function ensemblFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  await acquireToken();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (response.status === 429) {
      const retryAfter = parseFloat(
        response.headers.get("Retry-After") ?? "1",
      );
      await sleep(retryAfter * 1000);
      await acquireToken();
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new EnsemblApiError(response.status, errorBody, path);
    }

    return response.json() as Promise<T>;
  }

  throw new EnsemblApiError(429, "Max retries exceeded", path);
}
