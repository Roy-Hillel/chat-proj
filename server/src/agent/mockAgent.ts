import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { tools } from "./registry";
import { AgentEvent, ToolContext } from "./types";

/**
 * Mock agent for fallback when OpenAI API is unavailable.
 * Uses keyword matching to simulate tool usage for demo purposes.
 *
 * Supported patterns:
 * - "watchlist: <movie_name>" → adds movie to watchlist
 * - "search" → triggers movie info search (placeholder)
 * - Any other text → triggers movie recommendations
 */
export async function* runMockAgent(
  messages: ChatCompletionMessageParam[],
  context: ToolContext
): AsyncGenerator<AgentEvent> {
  const lastMessage = messages[messages.length - 1];
  const lastContent =
    typeof lastMessage.content === "string" ? lastMessage.content : "";
  const lastMsg = lastContent.toLowerCase();

  // Simulate "thinking" delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check for watchlist pattern: "watchlist: <movie_name>"
  const watchlistMatch = lastContent.match(/watchlist:\s*(.+)/i);

  if (watchlistMatch) {
    const movieName = watchlistMatch[1].trim();
    yield {
      type: "content",
      content: `Adding "${movieName}" to your watchlist...\n`,
    };

    // Mock Tool Call - watchlist
    yield {
      type: "tool_start",
      tool: "add_to_watchlist",
      input: { titles: [movieName] },
    };
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Use the actual watchlist tool if available
    try {
      const tool = tools["add_to_watchlist"];
      const result = await tool.run({ titles: [movieName] }, context);
      yield { type: "tool_end", tool: "add_to_watchlist", output: result };
      yield { type: "content", content: result };
    } catch {
      const result = `✅ Added to your watchlist: ${movieName}`;
      yield { type: "tool_end", tool: "add_to_watchlist", output: result };
      yield { type: "content", content: result };
    }
  } else if (lastMsg.includes("search")) {
    yield { type: "content", content: "Searching for movie info...\n" };

    yield {
      type: "tool_start",
      tool: "search_movie_info",
      input: { movieTitle: lastContent, infoType: "all" },
    };
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const result =
      "🔍 Movie Info Search Results:\n\n⚠️ This feature is coming soon! In the future, I'll be able to fetch cast, trivia, and photos.";
    yield { type: "tool_end", tool: "search_movie_info", output: result };

    yield { type: "content", content: result };
  } else {
    // Treat everything else as a movie query for this test phase
    yield { type: "content", content: "Looking up movie recommendations...\n" };

    const toolName = "movie_recommendations";
    // Simple heuristic: use the full message as the query
    const input = { query: lastContent };

    yield { type: "tool_start", tool: toolName, input };

    try {
      // Use the actual tool since we implemented it
      const tool = tools[toolName];
      const result = await tool.run(input, context);

      yield { type: "tool_end", tool: toolName, output: result };
      yield { type: "content", content: result };
    } catch {
      const reply =
        "I am currently in Mock Mode. I tried to look for a movie but failed. Try 'watchlist: Movie Name' to add to your watchlist or 'search' for movie info.";

      for (const char of reply) {
        yield { type: "content", content: char };
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  }

  yield { type: "done" };
}
