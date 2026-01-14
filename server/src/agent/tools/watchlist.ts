import { PrismaClient } from "@prisma/client";
import { AgentTool, ToolContext } from "../types";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OmdbResponse {
  Title: string;
  imdbRating: string;
  Plot?: string;
  Response: string;
  Error?: string;
}

interface AddToWatchlistArgs {
  titles: string[];
  userRating?: number;
}

interface GetWatchlistArgs {
  sortBy?: "addedAt" | "imdbRating" | "userRating";
  watched?: boolean;
}

interface RemoveFromWatchlistArgs {
  titles: string[];
}

interface RateWatchlistMovieArgs {
  title: string;
  rating: number;
}

interface MarkAsWatchedArgs {
  titles: string[];
  watched: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseImdbRating(ratingStr: string | undefined): number | null {
  if (!ratingStr || ratingStr === "N/A") return null;
  const n = Number.parseFloat(ratingStr);
  return Number.isFinite(n) ? n : null;
}

async function fetchOmdbData(title: string): Promise<{
  title: string;
  imdbRating: number | null;
  plot: string | null;
}> {
  const omdbKey = process.env.OMDB_API_KEY;
  if (!omdbKey) {
    return { title, imdbRating: null, plot: null };
  }

  try {
    const res = await fetch(
      `http://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${omdbKey}`
    );
    const data = (await res.json()) as OmdbResponse;

    if (data.Response === "False") {
      return { title, imdbRating: null, plot: null };
    }

    return {
      title: data.Title || title,
      imdbRating: parseImdbRating(data.imdbRating),
      plot: data.Plot ?? null,
    };
  } catch {
    return { title, imdbRating: null, plot: null };
  }
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/**
 * Find a watchlist item by title (case-insensitive).
 * SQLite doesn't support Prisma's mode: "insensitive", so we fetch
 * user's items and filter manually.
 */
async function findWatchlistItemByTitle(
  userId: string,
  title: string
): Promise<{
  id: string;
  title: string;
  imdbRating: number | null;
  userRating: number | null;
} | null> {
  const normalizedSearch = normalizeTitle(title);
  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    select: { id: true, title: true, imdbRating: true, userRating: true },
  });
  return (
    items.find((item) => normalizeTitle(item.title) === normalizedSearch) ||
    null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tools
// ─────────────────────────────────────────────────────────────────────────────

export const addToWatchlistTool: AgentTool = {
  name: "add_to_watchlist",
  definition: {
    type: "function",
    function: {
      name: "add_to_watchlist",
      description:
        "Add one or more movies to the user's personal watchlist. Automatically fetches IMDb rating and plot. Use when the user says 'add X to my watchlist', 'save this movie', or 'remember this for later'.",
      parameters: {
        type: "object",
        properties: {
          titles: {
            type: "array",
            items: { type: "string" },
            description: "Movie titles to add to the watchlist.",
          },
          userRating: {
            type: "number",
            description:
              "Optional user rating (1-10) to assign to all added movies.",
          },
        },
        required: ["titles"],
      },
    },
  },
  run: async (args: Record<string, unknown>, context: ToolContext) => {
    const { titles, userRating } = args as unknown as AddToWatchlistArgs;
    const { userId } = context;

    if (!titles || titles.length === 0) {
      return "No movie titles provided to add.";
    }

    // Validate userRating if provided
    const validatedRating =
      userRating !== undefined
        ? Math.min(10, Math.max(1, Math.round(userRating)))
        : undefined;

    const results: string[] = [];
    const added: string[] = [];
    const alreadyExists: string[] = [];
    const errors: string[] = [];

    for (const rawTitle of titles) {
      const titleStr = String(rawTitle).trim();
      if (!titleStr) continue;

      try {
        // Check if already in watchlist (case-insensitive)
        const existing = await findWatchlistItemByTitle(userId, titleStr);

        if (existing) {
          alreadyExists.push(existing.title);
          continue;
        }

        // Fetch OMDB data
        const omdbData = await fetchOmdbData(titleStr);

        // Create watchlist item
        await prisma.watchlistItem.create({
          data: {
            userId,
            title: omdbData.title,
            imdbRating: omdbData.imdbRating,
            plot: omdbData.plot,
            userRating: validatedRating,
          },
        });

        const ratingInfo = omdbData.imdbRating
          ? ` (IMDb: ${omdbData.imdbRating})`
          : "";
        added.push(`${omdbData.title}${ratingInfo}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        if (errorMessage.includes("Unique constraint")) {
          alreadyExists.push(titleStr);
        } else {
          errors.push(`${titleStr}: ${errorMessage}`);
        }
      }
    }

    // Build response
    if (added.length > 0) {
      results.push(`✅ Added to your watchlist:\n${added.join("\n")}`);
    }
    if (alreadyExists.length > 0) {
      results.push(`ℹ️ Already in your watchlist: ${alreadyExists.join(", ")}`);
    }
    if (errors.length > 0) {
      results.push(`❌ Failed to add: ${errors.join(", ")}`);
    }

    if (results.length === 0) {
      return "No valid movie titles were provided.";
    }

    return results.join("\n\n");
  },
};

export const getWatchlistTool: AgentTool = {
  name: "get_watchlist",
  definition: {
    type: "function",
    function: {
      name: "get_watchlist",
      description:
        "Retrieve the user's watchlist. Use when the user asks 'show my watchlist', 'what movies have I saved?', 'what's on my list?', 'show unwatched movies', or 'what haven't I watched yet?'.",
      parameters: {
        type: "object",
        properties: {
          sortBy: {
            type: "string",
            enum: ["addedAt", "imdbRating", "userRating"],
            description:
              "How to sort the results. 'addedAt' (default): newest first. 'imdbRating': highest rated first. 'userRating': by user's personal rating.",
          },
          watched: {
            type: "boolean",
            description:
              "Filter by watched status. true: only watched movies. false: only unwatched movies. Omit to show all.",
          },
        },
        required: [],
      },
    },
  },
  run: async (args: Record<string, unknown>, context: ToolContext) => {
    const { sortBy = "addedAt", watched } = args as unknown as GetWatchlistArgs;
    const { userId } = context;

    // Build orderBy based on sortBy
    type OrderByField = { [key: string]: "asc" | "desc" };
    let orderBy: OrderByField;

    switch (sortBy) {
      case "imdbRating":
        orderBy = { imdbRating: "desc" };
        break;
      case "userRating":
        orderBy = { userRating: "desc" };
        break;
      case "addedAt":
      default:
        orderBy = { addedAt: "desc" };
    }

    // Build where clause with optional watched filter
    const whereClause: { userId: string; watched?: boolean } = { userId };
    if (watched !== undefined) {
      whereClause.watched = watched;
    }

    try {
      const watchlist = await prisma.watchlistItem.findMany({
        where: whereClause,
        orderBy,
      });

      if (watchlist.length === 0) {
        if (watched === false) {
          return "🎉 You've watched everything on your list! Add more movies to watch.";
        }
        if (watched === true) {
          return "You haven't marked any movies as watched yet.";
        }
        return "Your watchlist is empty. Use 'add to watchlist' to save movies!";
      }

      const formatted = watchlist.map((item, index) => {
        const imdb = item.imdbRating ? `IMDb: ${item.imdbRating}` : "IMDb: N/A";
        const userRating = item.userRating
          ? `Your rating: ${item.userRating}/10`
          : "Your rating: Not rated";
        const watchedStatus = item.watched ? "✅ Watched" : "⏳ Not watched";
        const plot = item.plot ? `\n   Plot: ${item.plot}` : "";

        return `${index + 1}. **${
          item.title
        }** [${watchedStatus}]\n   ${imdb} | ${userRating}${plot}`;
      });

      const sortLabel =
        sortBy === "imdbRating"
          ? "by IMDb rating"
          : sortBy === "userRating"
          ? "by your rating"
          : "by date added";

      const filterLabel =
        watched === true
          ? " - watched only"
          : watched === false
          ? " - unwatched only"
          : "";

      return `📽️ Your Watchlist (${
        watchlist.length
      } movies, sorted ${sortLabel}${filterLabel}):\n\n${formatted.join(
        "\n\n"
      )}`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to retrieve watchlist: ${errorMessage}`);
    }
  },
};

export const removeFromWatchlistTool: AgentTool = {
  name: "remove_from_watchlist",
  definition: {
    type: "function",
    function: {
      name: "remove_from_watchlist",
      description:
        "Remove one or more movies from the user's watchlist. Use when the user says 'remove X from my watchlist', 'delete from watchlist', or 'I already watched X'.",
      parameters: {
        type: "object",
        properties: {
          titles: {
            type: "array",
            items: { type: "string" },
            description: "Movie titles to remove from the watchlist.",
          },
        },
        required: ["titles"],
      },
    },
  },
  run: async (args: Record<string, unknown>, context: ToolContext) => {
    const { titles } = args as unknown as RemoveFromWatchlistArgs;
    const { userId } = context;

    if (!titles || titles.length === 0) {
      return "No movie titles provided to remove.";
    }

    const removed: string[] = [];
    const notFound: string[] = [];

    for (const rawTitle of titles) {
      const titleStr = String(rawTitle).trim();
      if (!titleStr) continue;

      try {
        // Find the item (case-insensitive)
        const existing = await findWatchlistItemByTitle(userId, titleStr);

        if (!existing) {
          notFound.push(titleStr);
          continue;
        }

        // Delete it
        await prisma.watchlistItem.delete({
          where: { id: existing.id },
        });

        removed.push(existing.title);
      } catch {
        notFound.push(titleStr);
      }
    }

    // Build response
    const results: string[] = [];

    if (removed.length > 0) {
      results.push(`✅ Removed from your watchlist: ${removed.join(", ")}`);
    }
    if (notFound.length > 0) {
      results.push(`ℹ️ Not in your watchlist: ${notFound.join(", ")}`);
    }

    if (results.length === 0) {
      return "No valid movie titles were provided.";
    }

    return results.join("\n\n");
  },
};

export const rateWatchlistMovieTool: AgentTool = {
  name: "rate_watchlist_movie",
  definition: {
    type: "function",
    function: {
      name: "rate_watchlist_movie",
      description:
        "Set or update the user's personal rating for a movie in their watchlist. Use when the user says 'rate X as 8', 'give X a 9/10', or 'I'd rate that movie 7 out of 10'.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The movie title to rate.",
          },
          rating: {
            type: "number",
            description: "The user's rating from 1 to 10.",
          },
        },
        required: ["title", "rating"],
      },
    },
  },
  run: async (args: Record<string, unknown>, context: ToolContext) => {
    const { title, rating } = args as unknown as RateWatchlistMovieArgs;
    const { userId } = context;

    if (!title || typeof title !== "string") {
      return "Please provide a movie title to rate.";
    }

    if (typeof rating !== "number" || !Number.isFinite(rating)) {
      return "Please provide a valid rating between 1 and 10.";
    }

    // Clamp rating to 1-10 range
    const validatedRating = Math.min(10, Math.max(1, Math.round(rating)));
    const titleStr = title.trim();

    try {
      // Find the item (case-insensitive)
      const existing = await findWatchlistItemByTitle(userId, titleStr);

      if (!existing) {
        return `"${titleStr}" is not in your watchlist. Add it first with 'add to watchlist'.`;
      }

      // Update the rating
      const updated = await prisma.watchlistItem.update({
        where: { id: existing.id },
        data: { userRating: validatedRating },
      });

      const imdbComparison = updated.imdbRating
        ? ` (IMDb rating: ${updated.imdbRating})`
        : "";

      return `✅ Rated "${updated.title}" ${validatedRating}/10${imdbComparison}`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to rate movie: ${errorMessage}`);
    }
  },
};

export const markAsWatchedTool: AgentTool = {
  name: "mark_as_watched",
  definition: {
    type: "function",
    function: {
      name: "mark_as_watched",
      description:
        "Mark one or more movies as watched or unwatched in the user's watchlist. Use when the user says 'I watched X', 'mark X as watched', 'I've seen X', or 'mark X as unwatched'.",
      parameters: {
        type: "object",
        properties: {
          titles: {
            type: "array",
            items: { type: "string" },
            description: "Movie titles to mark as watched/unwatched.",
          },
          watched: {
            type: "boolean",
            description:
              "true (default): mark as watched. false: mark as unwatched.",
          },
        },
        required: ["titles"],
      },
    },
  },
  run: async (args: Record<string, unknown>, context: ToolContext) => {
    const { titles, watched = true } = args as unknown as MarkAsWatchedArgs;
    const { userId } = context;

    if (!titles || titles.length === 0) {
      return "No movie titles provided.";
    }

    const updated: string[] = [];
    const notFound: string[] = [];

    for (const rawTitle of titles) {
      const titleStr = String(rawTitle).trim();
      if (!titleStr) continue;

      try {
        // Find the item (case-insensitive)
        const existing = await findWatchlistItemByTitle(userId, titleStr);

        if (!existing) {
          notFound.push(titleStr);
          continue;
        }

        // Update watched status
        await prisma.watchlistItem.update({
          where: { id: existing.id },
          data: { watched },
        });

        updated.push(existing.title);
      } catch {
        notFound.push(titleStr);
      }
    }

    // Build response
    const results: string[] = [];
    const statusText = watched ? "watched" : "unwatched";
    const emoji = watched ? "✅" : "⏳";

    if (updated.length > 0) {
      results.push(`${emoji} Marked as ${statusText}: ${updated.join(", ")}`);
    }
    if (notFound.length > 0) {
      results.push(`ℹ️ Not in your watchlist: ${notFound.join(", ")}`);
    }

    if (results.length === 0) {
      return "No valid movie titles were provided.";
    }

    return results.join("\n\n");
  },
};
