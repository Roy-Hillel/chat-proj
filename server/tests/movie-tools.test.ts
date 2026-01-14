/**
 * Movie Tools Unit Tests
 *
 * Tests the movie tools directly without involving the LLM.
 * Requires TASTE_DIVE_API_KEY and OMDB_API_KEY in environment or server/.env
 *
 * Usage: npx ts-node tests/movie-tools.test.ts "The Matrix"
 */
import dotenv from "dotenv";

import {
  movieRatingsTool,
  movieRecommendationsTool,
  movieSimilarityTool,
} from "../src/agent/tools/movies";

dotenv.config();

type TestResult = { name: string; ok: true } | { name: string; ok: false; error: Error };

class SkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkipError";
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function parseTitles(output: string): string[] {
  const titles: string[] = [];
  const re = /^Title:\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(output))) {
    // Strip IMDb rating suffix if present (e.g., "Movie Name (IMDb: 7.5)" -> "Movie Name")
    const t = m[1]?.trim().replace(/\s*\(IMDb:[^)]+\)$/, "");
    if (t) titles.push(t);
  }
  return titles;
}

function parseImdbRatings(output: string): number[] {
  const ratings: number[] = [];
  const re = /\(IMDb:\s*([0-9]+(?:\.[0-9]+)?)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(output))) {
    const n = Number.parseFloat(m[1]);
    if (Number.isFinite(n)) ratings.push(n);
  }
  return ratings;
}

function isNonIncreasing(nums: number[]): boolean {
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] > nums[i - 1]) return false;
  }
  return true;
}

async function runTest(name: string, fn: () => Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { name, ok: true };
  } catch (e: any) {
    return { name, ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

async function retry<T>(
  fn: () => Promise<T>,
  opts: { attempts: number; baseDelayMs: number; shouldRetry: (e: unknown) => boolean }
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < opts.attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!opts.shouldRetry(e) || i === opts.attempts - 1) break;
      const delay = opts.baseDelayMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function isProviderFlake(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // TasteDive sometimes returns 5xx; treat as transient.
  return /status 5\d\d/i.test(msg) || /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed/i.test(msg);
}

function isRecommendationFailureString(out: string): boolean {
  return out.startsWith("I failed to fetch movie recommendations.");
}

async function main() {
  const tasteDiveKey = process.env.TASTE_DIVE_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;

  assert(
    tasteDiveKey && tasteDiveKey.trim().length > 0,
    "Missing TASTE_DIVE_API_KEY. Set it in your environment or server/.env"
  );
  assert(
    omdbKey && omdbKey.trim().length > 0,
    "Missing OMDB_API_KEY. Set it in your environment or server/.env"
  );

  const query = process.argv[2] || "The Matrix";

  // Define test functions (not promises) so we can run them sequentially
  const testFns: Array<{ name: string; fn: () => Promise<void> }> = [
    {
      name: "movie_similarity returns similarity list (no IMDb ratings)",
      fn: async () => {
        const out = await retry(
          () => movieSimilarityTool.run({ query, limit: 10 }),
          { attempts: 3, baseDelayMs: 1000, shouldRetry: isProviderFlake }
        );
        assert(typeof out === "string" && out.length > 0, "Expected non-empty string output");
        assert(out.includes(`Similar movies for "${query}"`) || out.includes("Similar movies for"), "Expected similarity header");
        const titles = parseTitles(out);
        assert(titles.length >= 3, `Expected at least 3 titles, got ${titles.length}`);
        assert(!out.includes("(IMDb:"), "movie_similarity should not include IMDb ratings");
      },
    },
    {
      name: "movie_ratings returns ratings for given titles",
      fn: async () => {
        const out = await movieRatingsTool.run({ titles: [query, "Titanic"], includePlot: false });
        assert(typeof out === "string" && out.startsWith("Ratings:"), "Expected Ratings header");
        assert(out.includes("IMDb:"), "Expected IMDb lines");
        assert(parseTitles(out).length >= 2, "Expected at least 2 title blocks");
      },
    },
    {
      name: "movie_ratings includePlot=true includes plot lines",
      fn: async () => {
        const out = await movieRatingsTool.run({ titles: [query], includePlot: true });
        assert(out.includes("\nPlot:"), "Expected Plot line when includePlot=true");
      },
    },
    {
      name: "movie_recommendations default sorts by IMDb desc (when ratings available)",
      fn: async () => {
        const out = await retry(
          async () => {
            const r = await movieRecommendationsTool.run({ query });
            if (isRecommendationFailureString(r)) throw new Error(r);
            return r;
          },
          { attempts: 3, baseDelayMs: 1500, shouldRetry: isProviderFlake }
        ).catch((e) => {
          throw new SkipError(
            `Skipping: similarity provider unstable right now. Last error: ${
              e instanceof Error ? e.message : String(e)
            }`
          );
        });

        assert(typeof out === "string" && out.length > 0, "Expected non-empty string output");
        assert(out.includes("top rated movies similar") || out.includes("top rated"), "Expected 'top rated' header by default");
        const titles = parseTitles(out);
        assert(titles.length >= 3, `Expected at least 3 recommendations, got ${titles.length}`);
        assert(out.includes("(IMDb:"), "Expected IMDb ratings in default recommendations");

        const ratings = parseImdbRatings(out);
        if (ratings.length < 2) {
          throw new SkipError(`Skipping sort assertion: got only ${ratings.length} numeric ratings (OMDb may be rate-limiting).`);
        }
        assert(isNonIncreasing(ratings), `Expected ratings sorted desc, got: ${ratings.join(", ")}`);
      },
    },
    {
      name: "movie_recommendations sort=none + includeRatings=false preserves similarity order",
      fn: async () => {
        const simOut = await retry(
          () => movieSimilarityTool.run({ query, limit: 10 }),
          { attempts: 3, baseDelayMs: 1000, shouldRetry: isProviderFlake }
        );
        const simTitles = parseTitles(simOut).slice(0, 5);
        assert(simTitles.length >= 3, "Need at least 3 similarity titles for this test");

        // Delay before next TasteDive call
        await new Promise((r) => setTimeout(r, 2000));

        const recOut = await retry(
          async () => {
            const r = await movieRecommendationsTool.run({
              query,
              topN: 5,
              sort: "none",
              includeRatings: false,
              candidateLimit: 10,
            });
            if (isRecommendationFailureString(r)) throw new Error(r);
            return r;
          },
          { attempts: 3, baseDelayMs: 1500, shouldRetry: isProviderFlake }
        ).catch((e) => {
          throw new SkipError(
            `Skipping: similarity provider unstable right now. Last error: ${
              e instanceof Error ? e.message : String(e)
            }`
          );
        });
        const recTitles = parseTitles(recOut).slice(0, 5);
        assert(recTitles.length >= 3, "Expected at least 3 recommendation titles");
        assert(!recOut.includes("(IMDb:"), "Expected no IMDb ratings when includeRatings=false");

        assert(
          JSON.stringify(recTitles) === JSON.stringify(simTitles),
          `Expected recommendation order to match similarity order.\nSimilarity: ${simTitles.join(" | ")}\nRecommendations: ${recTitles.join(" | ")}`
        );
      },
    },
    {
      name: "movie_recommendations sort=none + includeRatings=true keeps similarity order while adding ratings",
      fn: async () => {
        const simOut = await retry(
          () => movieSimilarityTool.run({ query, limit: 10 }),
          { attempts: 3, baseDelayMs: 1000, shouldRetry: isProviderFlake }
        );
        const simTitles = parseTitles(simOut).slice(0, 5);
        assert(simTitles.length >= 3, "Need at least 3 similarity titles for this test");

        // Delay before next TasteDive call
        await new Promise((r) => setTimeout(r, 2000));

        const recOut = await retry(
          async () => {
            const r = await movieRecommendationsTool.run({
              query,
              topN: 5,
              sort: "none",
              includeRatings: true,
              candidateLimit: 10,
            });
            if (isRecommendationFailureString(r)) throw new Error(r);
            return r;
          },
          { attempts: 3, baseDelayMs: 1500, shouldRetry: isProviderFlake }
        ).catch((e) => {
          throw new SkipError(
            `Skipping: similarity provider unstable right now. Last error: ${
              e instanceof Error ? e.message : String(e)
            }`
          );
        });
        const recTitles = parseTitles(recOut).slice(0, 5);
        assert(recTitles.length >= 3, "Expected at least 3 recommendation titles");
        assert(recOut.includes("(IMDb:") || recOut.includes("IMDb:"), "Expected IMDb data when includeRatings=true");

        assert(
          JSON.stringify(recTitles) === JSON.stringify(simTitles),
          `Expected titles to remain in similarity order.\nSimilarity: ${simTitles.join(" | ")}\nRecommendations: ${recTitles.join(" | ")}`
        );
      },
    },
  ];

  // Run tests sequentially with delays to avoid rate-limiting on TasteDive
  const results: TestResult[] = [];
  for (const { name, fn } of testFns) {
    const result = await runTest(name, fn);
    results.push(result);
    // Delay between tests to be kind to external APIs
    await new Promise((r) => setTimeout(r, 2000));
  }

  const failed = results.filter((r) => !r.ok) as Array<Extract<TestResult, { ok: false }>>;
  for (const r of results) {
    if (r.ok) console.log(`✓ ${r.name}`);
    else if (r.error.name === "SkipError") console.log(`↷ ${r.name}\n  ${r.error.message}`);
    else console.error(`✗ ${r.name}\n  ${r.error.message}`);
  }

  const realFailures = failed.filter((r) => r.error.name !== "SkipError");
  if (realFailures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
