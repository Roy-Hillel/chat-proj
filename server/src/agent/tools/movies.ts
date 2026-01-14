import { AgentTool } from "../types";

interface OmdbResponse {
  Title: string;
  imdbRating: string;
  Plot?: string;
}

type SimilarMovie = {
  title: string;
  summary: string;
  trailerUrl: string | null;
};

type RatedMovie = {
  title: string;
  imdbRating: number | null;
  plot: string | null;
};

function parseImdbRating(ratingStr: string | undefined): number | null {
  if (!ratingStr || ratingStr === "N/A") return null;
  const n = Number.parseFloat(ratingStr);
  return Number.isFinite(n) ? n : null;
}

async function fetchSimilarMoviesFromTasteDive(args: {
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

async function fetchOmdbDetails(args: {
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
        "Find similar movies without ratings or sorting. Use ONLY when the user explicitly wants just a similarity list (e.g., 'what movies are like X?' without mentioning ratings or best). For general recommendations, prefer movie_recommendations instead.",
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
  run: async ({ query, limit }: { query: string; limit?: number }) => {
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
  run: async ({
    titles,
    includePlot,
  }: {
    titles: string[];
    includePlot?: boolean;
  }) => {
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
        "PRIMARY tool for movie recommendations. Finds similar movies based on user's input, enriches with IMDb ratings, and returns top results sorted by rating (best first). Use this for any 'recommend movies like X' or 'suggest movies similar to X' request. Defaults: sorted by IMDb rating descending, includes ratings.",
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
            description: "Number of recommendations to return. Default: 5.",
          },
          sort: {
            type: "string",
            enum: ["imdb_desc", "none"],
            description:
              "imdb_desc (default): best-rated first. none: keep original similarity order. Use 'none' only if user says 'don't sort' or 'any order'.",
          },
          includeRatings: {
            type: "boolean",
            description:
              "true (default): show IMDb ratings. false: omit ratings. Use false only if user says 'no ratings' or 'just titles'.",
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
  run: async ({
    query,
    topN,
    sort,
    includeRatings,
    candidateLimit,
  }: {
    query: string;
    topN?: number;
    sort?: "imdb_desc" | "none";
    includeRatings?: boolean;
    candidateLimit?: number;
  }) => {
    const tasteDiveKey = process.env.TASTE_DIVE_API_KEY;
    const omdbKey = process.env.OMDB_API_KEY;

    if (!tasteDiveKey) {
      throw new Error("Missing TASTE_DIVE_API_KEY environment variable.");
    }

    const resolvedTopN = Number.isFinite(topN as number)
      ? Math.max(1, topN as number)
      : 5;
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
          ? `Here are the top rated movies similar to "${query}":`
          : `Here are similar movies for "${query}":`;

      const formattedResults = selected
        .filter((m) => m.title)
        .map((m) => {
          const rating =
            m.imdbRating === null ? "" : ` (IMDb: ${m.imdbRating})`;
          const summary = (m.plot || m.summary || "").trim() || "N/A";
          return `Title: ${m.title}${rating}\nSummary: ${summary}\nTrailer: ${
            m.trailerUrl || "N/A"
          }`;
        })
        .join("\n\n");

      // Note: if OMDB key is missing, we'll gracefully return similarity-only.
      return `${header}\n\n${formattedResults}`;
    } catch (error: any) {
      console.error("Movie mashup failed:", error);
      return "I failed to fetch movie recommendations. " + error.message;
    }
  },
};
