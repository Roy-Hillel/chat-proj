import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityIndicator } from "./ActivityIndicator";

describe("ActivityIndicator Component", () => {
  describe("Rendering", () => {
    it("returns null when activities array is empty", () => {
      const { container } = render(<ActivityIndicator activities={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders activity container when activities exist", () => {
      const activities = [
        {
          type: "tool_start" as const,
          tool: "search",
          input: { query: "test" },
          timestamp: Date.now(),
        },
      ];
      const { container } = render(
        <ActivityIndicator activities={activities} />
      );
      expect(container.querySelector(".bg-gray-50")).toBeInTheDocument();
    });

    it("renders multiple activities", () => {
      const activities = [
        {
          type: "tool_start" as const,
          tool: "search",
          input: { query: "test1" },
          timestamp: Date.now(),
        },
        {
          type: "tool_end" as const,
          tool: "search",
          output: "result1",
          timestamp: Date.now() + 1000,
        },
      ];
      render(<ActivityIndicator activities={activities} />);
      // Component uses "Using {ToolName}..." for tool_start and "{ToolName} completed" for tool_end
      // "Search" appears twice (once for start, once for end)
      const searchElements = screen.getAllByText("Search");
      expect(searchElements.length).toBe(2);
      expect(screen.getByText(/Using/)).toBeInTheDocument();
      expect(screen.getByText(/completed/)).toBeInTheDocument();
    });
  });

  describe("Tool Start Activity", () => {
    it("displays tool_start with loader icon", () => {
      const activities = [
        {
          type: "tool_start" as const,
          tool: "add_to_watchlist",
          input: { titles: ["The Matrix"] },
          timestamp: Date.now(),
        },
      ];
      const { container } = render(
        <ActivityIndicator activities={activities} />
      );
      // Component formats tool names: "add_to_watchlist" -> "Add To Watchlist"
      expect(screen.getByText("Add To Watchlist")).toBeInTheDocument();
      expect(screen.getByText(/Using/)).toBeInTheDocument();
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
      expect(container.querySelector(".text-blue-500")).toBeInTheDocument();
    });

    it("displays formatted tool name correctly", () => {
      const activities = [
        {
          type: "tool_start" as const,
          tool: "get_movie_recommendations",
          input: { movie: "Inception" },
          timestamp: Date.now(),
        },
      ];
      render(<ActivityIndicator activities={activities} />);
      // Tool name should be formatted with capital letters and spaces
      expect(screen.getByText("Get Movie Recommendations")).toBeInTheDocument();
    });

    it("handles single-word tool names", () => {
      const activities = [
        {
          type: "tool_start" as const,
          tool: "search",
          input: { query: "test" },
          timestamp: Date.now(),
        },
      ];
      render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText("Search")).toBeInTheDocument();
    });
  });

  describe("Tool End Activity", () => {
    it("displays tool_end with check icon", () => {
      const activities = [
        {
          type: "tool_end" as const,
          tool: "add_to_watchlist",
          output: "✅ Added to your watchlist: The Matrix",
          timestamp: Date.now(),
        },
      ];
      const { container } = render(
        <ActivityIndicator activities={activities} />
      );
      // Component shows "{ToolName} completed" format
      expect(screen.getByText("Add To Watchlist")).toBeInTheDocument();
      expect(screen.getByText(/completed/)).toBeInTheDocument();
      expect(container.querySelector(".text-green-500")).toBeInTheDocument();
    });

    it("displays formatted tool name for completed tools", () => {
      const activities = [
        {
          type: "tool_end" as const,
          tool: "get_watchlist",
          output: "Your watchlist",
          timestamp: Date.now(),
        },
      ];
      render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText("Get Watchlist")).toBeInTheDocument();
      expect(screen.getByText(/completed/)).toBeInTheDocument();
    });

    it("renders check circle icon for completed tools", () => {
      const activities = [
        {
          type: "tool_end" as const,
          tool: "search",
          output: { results: ["item1", "item2"] },
          timestamp: Date.now(),
        },
      ];
      const { container } = render(
        <ActivityIndicator activities={activities} />
      );
      // CheckCircle2 icon should have text-green-500 class
      expect(container.querySelector(".text-green-500")).toBeInTheDocument();
    });
  });

  describe("Error Activity", () => {
    it("displays error with alert icon", () => {
      const activities = [
        {
          type: "error" as const,
          error: "Tool execution failed",
          timestamp: Date.now(),
        },
      ];
      const { container } = render(
        <ActivityIndicator activities={activities} />
      );
      // Component shows generic "Error occurred" message
      expect(screen.getByText("Error occurred")).toBeInTheDocument();
      expect(container.querySelector(".text-red-500")).toBeInTheDocument();
    });

    it("applies red text color to error messages", () => {
      const activities = [
        {
          type: "error" as const,
          error: "Network timeout",
          timestamp: Date.now(),
        },
      ];
      const { container } = render(
        <ActivityIndicator activities={activities} />
      );
      const errorDiv = container.querySelector(".text-red-600");
      expect(errorDiv).toBeInTheDocument();
      expect(errorDiv?.textContent).toContain("Error occurred");
    });
  });

  describe("Styling", () => {
    it("applies correct container styling", () => {
      const activities = [
        {
          type: "tool_start" as const,
          tool: "test",
          input: {},
          timestamp: Date.now(),
        },
      ];
      const { container } = render(
        <ActivityIndicator activities={activities} />
      );
      expect(container.querySelector(".bg-gray-50")).toBeInTheDocument();
      expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
      expect(container.querySelector(".border-gray-100")).toBeInTheDocument();
    });

    it("applies correct spacing between activities", () => {
      const activities = [
        {
          type: "tool_start" as const,
          tool: "test",
          input: { test: true },
          timestamp: Date.now(),
        },
      ];
      const { container } = render(
        <ActivityIndicator activities={activities} />
      );
      expect(container.querySelector(".space-y-2")).toBeInTheDocument();
    });
  });

  describe("Activity Flow", () => {
    it("displays complete tool execution flow", () => {
      const activities = [
        {
          type: "tool_start" as const,
          tool: "get_watchlist",
          input: { sortBy: "addedAt" },
          timestamp: Date.now(),
        },
        {
          type: "tool_end" as const,
          tool: "get_watchlist",
          output: "📽️ Your Watchlist (2 movies)",
          timestamp: Date.now() + 100,
        },
      ];
      render(<ActivityIndicator activities={activities} />);
      // Should show both "Using Get Watchlist..." and "Get Watchlist completed"
      const toolNameElements = screen.getAllByText("Get Watchlist");
      expect(toolNameElements.length).toBe(2); // One for start, one for end
      expect(screen.getByText(/Using/)).toBeInTheDocument();
      expect(screen.getByText(/completed/)).toBeInTheDocument();
    });

    it("displays error after tool start", () => {
      const activities = [
        {
          type: "tool_start" as const,
          tool: "search",
          input: { query: "test" },
          timestamp: Date.now(),
        },
        {
          type: "error" as const,
          error: "API rate limit exceeded",
          timestamp: Date.now() + 50,
        },
      ];
      render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText("Search")).toBeInTheDocument();
      expect(screen.getByText(/Using/)).toBeInTheDocument();
      expect(screen.getByText("Error occurred")).toBeInTheDocument();
    });
  });
});
