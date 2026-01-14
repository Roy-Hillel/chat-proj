import { calculatorTool } from "./tools/calculator";
import { searchTool } from "./tools/search";
import {
  movieRecommendationsTool,
  movieRatingsTool,
  movieSimilarityTool,
} from "./tools/movies";
import { AgentTool } from "./types";

export const tools: Record<string, AgentTool> = {
  [calculatorTool.name]: calculatorTool,
  [searchTool.name]: searchTool,
  [movieSimilarityTool.name]: movieSimilarityTool,
  [movieRatingsTool.name]: movieRatingsTool,
  [movieRecommendationsTool.name]: movieRecommendationsTool,
};

export const toolDefinitions = Object.values(tools).map((t) => t.definition);
