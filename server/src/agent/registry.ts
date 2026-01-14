import { searchTool } from "./tools/search";
import {
  movieRecommendationsTool,
  movieRatingsTool,
  movieSimilarityTool,
} from "./tools/movies";
import {
  addToWatchlistTool,
  getWatchlistTool,
  removeFromWatchlistTool,
  rateWatchlistMovieTool,
  markAsWatchedTool,
} from "./tools/watchlist";
import { AgentTool } from "./types";

export const tools: Record<string, AgentTool> = {
  [searchTool.name]: searchTool,
  [movieSimilarityTool.name]: movieSimilarityTool,
  [movieRatingsTool.name]: movieRatingsTool,
  [movieRecommendationsTool.name]: movieRecommendationsTool,
  [addToWatchlistTool.name]: addToWatchlistTool,
  [getWatchlistTool.name]: getWatchlistTool,
  [removeFromWatchlistTool.name]: removeFromWatchlistTool,
  [rateWatchlistMovieTool.name]: rateWatchlistMovieTool,
  [markAsWatchedTool.name]: markAsWatchedTool,
};

export const toolDefinitions = Object.values(tools).map((t) => t.definition);
