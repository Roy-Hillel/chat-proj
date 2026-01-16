import { AgentTool, ToolContext } from "../types";

interface OmdbResponse {
  Title: string;
  imdbRating: string;
  Plot?: string;
}

// Exported types for testing
export type SimilarMovie = {
  title: string;
  summary: string;
  trailerUrl: string | null;
};

export type RatedMovie = {
  title: string;
  imdbRating: number | null;
  plot: string | null;
};

export function parseImdbRating(ratingStr: string | undefined): number | null {
  if (!ratingStr || ratingStr === "N/A") return null;
  const n = Number.parseFloat(ratingStr);
  return Number.isFinite(n) ? n : null;
}

// Exported for direct testing - fetches similar movies from TasteDive API
export async function fetchSimilarMoviesFromTasteDive(args: {
  query: string;
  apiKey: string;
  limit: number;
}): Promise<SimilarMovie[]> {
  const { query, apiKey, limit } = args;

  const params = new URLSearchParams({
    q: query,
    type: "movie",
    info: "1",
    limit: String(limit),
    k: apiKey,
  });

  const response = await fetch(
    `https://tastedive.com/api/similar?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `Similarity provider failed with status ${response.status}`
    );
  }

  const data = (await response.json()) as any;
  const similar = data.similar || data.Similar;
  const results = similar?.results || similar?.Results || [];

  return (results as any[]).map((m) => ({
    title: String(m.name || m.Name || "").trim(),
    summary: String(m.wTeaser || m.description || m.Description || "").trim(),
    trailerUrl: (m.yUrl || m.yURL || m.YUrl || null) as string | null,
  }));
}

// Exported for direct testing - fetches movie details from OMDB API
export async function fetchOmdbDetails(args: {
  title: string;
  apiKey: string;
}): Promise<RatedMovie> {
  const { title, apiKey } = args;
  const omdbRes = await fetch(
    `http://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${apiKey}`
  );
  const omdbData = (await omdbRes.json()) as OmdbResponse;

  return {
    title: omdbData.Title || title,
    imdbRating: parseImdbRating(omdbData.imdbRating),
    plot: omdbData.Plot ?? null,
  };
}

export const movieSimilarityTool: AgentTool = {
  name: "movie_similarity",
  definition: {
    type: "function",
    function: {
      name: "movie_similarity",
      description:
        "Find similar movies without ratings. PREFER using movie_recommendations instead, which includes IMDb ratings and sorting. Only use this tool if user explicitly says 'no ratings', 'just titles', or 'without scores'.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "A movie title (or comma-separated titles) to find similar movies for.",
          },
          limit: {
            type: "number",
            description: "How many similar movies to return. Default: 10.",
          },
        },
        required: ["query"],
      },
    },
  },
  run: async (args: Record<string, unknown>, _context: ToolContext) => {
    const { query, limit } = args as { query: string; limit?: number };
    const tasteDiveKey = process.env.TASTE_DIVE_API_KEY;
    if (!tasteDiveKey) {
      throw new Error("Missing TASTE_DIVE_API_KEY environment variable.");
    }

    const movies = await fetchSimilarMoviesFromTasteDive({
      query,
      apiKey: tasteDiveKey,
      limit: Number.isFinite(limit as number)
        ? Math.max(1, limit as number)
        : 10,
    });

    if (movies.length === 0) return `No similar movies found for "${query}".`;

    const formatted = movies
      .filter((m) => m.title)
      .map(
        (m) =>
          `Title: ${m.title}\nSummary: ${m.summary || "N/A"}\nTrailer: ${
            m.trailerUrl || "N/A"
          }`
      )
      .join("\n\n");

    return `Similar movies for "${query}":\n\n${formatted}`;
  },
};

export const movieRatingsTool: AgentTool = {
  name: "movie_ratings",
  definition: {
    type: "function",
    function: {
      name: "movie_ratings",
      description:
        "Look up IMDb ratings (and optionally plot) for specific movie titles the user names. Use when the user asks 'what is the rating of X?' or 'tell me about movie Y'. NOT for recommendations—use movie_recommendations for that.",
      parameters: {
        type: "object",
        properties: {
          titles: {
            type: "array",
            items: { type: "string" },
            description:
              "Movie titles to look up (e.g., ['The Matrix', 'Inception']).",
          },
          includePlot: {
            type: "boolean",
            description: "If true, include a plot summary. Default: false.",
          },
        },
        required: ["titles"],
      },
    },
  },
  run: async (args: Record<string, unknown>, _context: ToolContext) => {
    const { titles, includePlot } = args as {
      titles: string[];
      includePlot?: boolean;
    };
    const omdbKey = process.env.OMDB_API_KEY;
    if (!omdbKey) {
      throw new Error("Missing OMDB_API_KEY environment variable.");
    }

    const uniqueTitles = Array.from(
      new Set((titles || []).map((t) => String(t).trim()).filter(Boolean))
    );
    if (uniqueTitles.length === 0) return "No titles provided.";

    const details = await Promise.all(
      uniqueTitles.map(async (title) => {
        try {
          return await fetchOmdbDetails({ title, apiKey: omdbKey });
        } catch {
          return { title, imdbRating: null, plot: null } satisfies RatedMovie;
        }
      })
    );

    const formatted = details
      .map((m) => {
        const rating = m.imdbRating === null ? "N/A" : String(m.imdbRating);
        const plotLine = includePlot ? `\nPlot: ${m.plot || "N/A"}` : "";
        return `Title: ${m.title}\nIMDb: ${rating}${plotLine}`;
      })
      .join("\n\n");

    return `Ratings:\n\n${formatted}`;
  },
};

export const movieRecommendationsTool: AgentTool = {
  name: "movie_recommendations",
  definition: {
    type: "function",
    function: {
      name: "movie_recommendations",
      description:
        "ALWAYS USE THIS TOOL for any movie recommendation or 'similar movies' request. This is the PRIMARY and PREFERRED tool. Returns 4 movies by default with IMDb ratings, sorted by rating (best first). Examples: 'movies like X', 'similar to X', 'recommend movies', 'what should I watch'. IMPORTANT: Do NOT pass optional parameters - let defaults apply (4 movies, with ratings, sorted by IMDb).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The movie title (or comma-separated titles) to base recommendations on.",
          },
          topN: {
            type: "number",
            description:
              "Number of recommendations to return. Default: 4. Only set if user explicitly asks for a specific number.",
          },
          sort: {
            type: "string",
            enum: ["imdb_desc", "none"],
            description:
              "DO NOT SET unless user explicitly requests unsorted. Default 'imdb_desc' shows best-rated first. Only use 'none' if user says 'don't sort' or 'any order'.",
          },
          includeRatings: {
            type: "boolean",
            description:
              "DO NOT SET unless user explicitly says 'no ratings'. Default true shows IMDb ratings. Only set false if user says 'no ratings' or 'just titles'.",
          },
          candidateLimit: {
            type: "number",
            description:
              "How many candidates to fetch before selecting topN. Default: 10. Increase for broader selection.",
          },
        },
        required: ["query"],
      },
    },
  },
  run: async (args: Record<string, unknown>, _context: ToolContext) => {
    const { query, topN, sort, includeRatings, candidateLimit } = args as {
      query: string;
      topN?: number;
      sort?: "imdb_desc" | "none";
      includeRatings?: boolean;
      candidateLimit?: number;
    };
    const tasteDiveKey = process.env.TASTE_DIVE_API_KEY;
    const omdbKey = process.env.OMDB_API_KEY;

    if (!tasteDiveKey) {
      throw new Error("Missing TASTE_DIVE_API_KEY environment variable.");
    }

    const resolvedTopN = Number.isFinite(topN as number)
      ? Math.max(1, topN as number)
      : 4;
    const resolvedCandidateLimit = Number.isFinite(candidateLimit as number)
      ? Math.max(resolvedTopN, candidateLimit as number)
      : 10;
    const resolvedSort: "imdb_desc" | "none" = sort || "imdb_desc";
    const resolvedIncludeRatings =
      includeRatings === undefined ? true : Boolean(includeRatings);

    try {
      // 1) Similarity candidates
      const similar = await fetchSimilarMoviesFromTasteDive({
        query,
        apiKey: tasteDiveKey,
        limit: resolvedCandidateLimit,
      });

      if (similar.length === 0)
        return `No recommendations found for "${query}".`;

      // 2) Optionally enrich with ratings
      let enriched: Array<
        SimilarMovie & { imdbRating: number | null; plot: string | null }
      > = similar.map((m) => ({ ...m, imdbRating: null, plot: null }));

      if (resolvedIncludeRatings && omdbKey) {
        const ratings = await Promise.all(
          similar.map(async (m) => {
            try {
              return await fetchOmdbDetails({
                title: m.title,
                apiKey: omdbKey,
              });
            } catch {
              return {
                title: m.title,
                imdbRating: null,
                plot: null,
              } satisfies RatedMovie;
            }
          })
        );

        const byTitle = new Map(ratings.map((r) => [r.title.toLowerCase(), r]));
        enriched = similar.map((m) => {
          const r = byTitle.get(m.title.toLowerCase());
          return {
            ...m,
            imdbRating: r?.imdbRating ?? null,
            plot: r?.plot ?? null,
          };
        });
      }

      // 3) Sorting behavior
      if (resolvedSort === "imdb_desc" && resolvedIncludeRatings && omdbKey) {
        enriched.sort((a, b) => (b.imdbRating ?? -1) - (a.imdbRating ?? -1));
      }

      const selected = enriched.slice(0, resolvedTopN);
      const header =
        resolvedSort === "imdb_desc" && resolvedIncludeRatings && omdbKey
          ? `🎬 Top rated movies similar to "${query}" (sorted by IMDb rating):`
          : `🎬 Movies similar to "${query}":`;

      const formattedResults = selected
        .filter((m) => m.title)
        .map((m, index) => {
          const ratingDisplay = m.imdbRating !== null ? m.imdbRating : "N/A";
          const summary = (m.plot || m.summary || "").trim() || "N/A";
          return `${index + 1}. ${
            m.title
          } ⭐ IMDb: ${ratingDisplay}\n   ${summary}`;
        })
        .join("\n\n");

      // Note: if OMDB key is missing, we'll gracefully return similarity-only.
      return `${header}\n\n${formattedResults}`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Movie mashup failed:", error);
      return "I failed to fetch movie recommendations. " + errorMessage;
    }
  },
};
