import { AgentTool } from "../types";

interface TasteDiveResponse {
  similar: {
    info: Array<{
      name: string;
      type: string;
    }>;
    results: Array<{
      name: string;
      type: string;
      description?: string;
      wTeaser?: string;
      yUrl?: string;
    }>;
  };
}

export const movieRecommendationsTool: AgentTool = {
  name: "movie_recommendations",
  definition: {
    type: "function",
    function: {
      name: "movie_recommendations",
      description:
        "Find similar movies and recommendations based on a user's favorite movies.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The name of a movie (or comma-separated movies) to get recommendations for.",
          },
        },
        required: ["query"],
      },
    },
  },
  run: async ({ query }: { query: string }) => {
    const apiKey = process.env.TASTE_DIVE_API_KEY;
    if (!apiKey) {
      // For development purposes, if no key is present, we can return a mock or a helpful error
      // But per instructions, we must assume the key is in .env or warn.
      throw new Error(
        "Missing TASTE_DIVE_API_KEY environment variable. Please add it to your .env file."
      );
    }

    try {
      const params = new URLSearchParams({
        q: query,
        type: "movie",
        info: "1", // Get extra info like teasers
        limit: "5", // Limit to top 5 recommendations
        k: apiKey,
      });

      const response = await fetch(
        `https://tastedive.com/api/similar?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = (await response.json()) as any;

      // Handle both casing just in case, but prefer lowercase as seen in logs
      const similar = data.similar || data.Similar;

      if (!similar) {
        console.error("TasteDive API Error:", JSON.stringify(data));
        throw new Error(
          `API returned unexpected format: ${JSON.stringify(data)}`
        );
      }

      const results = similar.results || similar.Results;

      if (!results || results.length === 0) {
        return `No recommendations found for "${query}". Try a different movie title.`;
      }

      // Format results for the Agent
      const formattedResults = results
        .map((movie: any) => {
          const title = movie.name || movie.Name;
          const descriptionRaw = movie.description || movie.wTeaser || "";
          const description = descriptionRaw
            ? `\n   ${descriptionRaw.substring(0, 150)}...`
            : "";
          const link = movie.yUrl ? `\n   Trailer: ${movie.yUrl}` : "";
          return `- ${title}${description}${link}`;
        })
        .join("\n\n");

      return `Here are some movies similar to "${query}":\n\n${formattedResults}`;
    } catch (error) {
      console.error("Movie recommendation search failed:", error);
      return "I failed to fetch movie recommendations. Please check the API key and try again.";
    }
  },
};
