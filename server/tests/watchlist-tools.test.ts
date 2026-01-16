/**
 * Watchlist Tools Unit Tests
 *
 * Tests the watchlist tools directly without involving the LLM.
 * Creates a temporary test user in the database.
 *
 * Usage: npx ts-node tests/watchlist-tools.test.ts
 */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  addToWatchlistTool,
  getWatchlistTool,
  removeFromWatchlistTool,
  rateWatchlistMovieTool,
  markAsWatchedTool,
} from "../src/agent/tools/watchlist";
import { ToolContext } from "../src/agent/types";

dotenv.config({ quiet: true });

const prisma = new PrismaClient();

type TestResult =
  | { name: string; ok: true }
  | { name: string; ok: false; error: Error };

class SkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkipError";
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function runTest(
  name: string,
  fn: () => Promise<void>
): Promise<TestResult> {
  try {
    await fn();
    return { name, ok: true };
  } catch (e) {
    return {
      name,
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

// Test user context
let testUserId: string;
let context: ToolContext;

async function setupTestUser(): Promise<void> {
  // Create a unique test user
  const testEmail = `watchlist-test-${Date.now()}@test.com`;
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      name: "Watchlist Test User",
    },
  });
  testUserId = user.id;
  context = { userId: testUserId };
  console.log(`Created test user: ${testEmail} (${testUserId})`);
}

async function cleanupTestUser(): Promise<void> {
  // Delete all watchlist items for the test user
  await prisma.watchlistItem.deleteMany({
    where: { userId: testUserId },
  });
  // Delete the test user
  await prisma.user.delete({
    where: { id: testUserId },
  });
  console.log(`Cleaned up test user: ${testUserId}`);
}

async function clearWatchlist(): Promise<void> {
  await prisma.watchlistItem.deleteMany({
    where: { userId: testUserId },
  });
}

async function main() {
  try {
    await setupTestUser();

    const testFns: Array<{ name: string; fn: () => Promise<void> }> = [
      // ─────────────────────────────────────────────────────────────────────
      // add_to_watchlist tests
      // ─────────────────────────────────────────────────────────────────────
      {
        name: "add_to_watchlist adds a single movie",
        fn: async () => {
          await clearWatchlist();
          const out = await addToWatchlistTool.run(
            { titles: ["The Matrix"] },
            context
          );
          assert(typeof out === "string", "Expected string output");
          assert(out.includes("✅"), "Expected success indicator");
          assert(
            out.toLowerCase().includes("matrix"),
            "Expected Matrix in output"
          );

          // Verify in database
          const items = await prisma.watchlistItem.findMany({
            where: { userId: testUserId },
          });
          assert(items.length === 1, `Expected 1 item, got ${items.length}`);
        },
      },
      {
        name: "add_to_watchlist adds multiple movies",
        fn: async () => {
          await clearWatchlist();
          const out = await addToWatchlistTool.run(
            { titles: ["Inception", "Interstellar", "The Dark Knight"] },
            context
          );
          assert(out.includes("✅"), "Expected success indicator");

          const items = await prisma.watchlistItem.findMany({
            where: { userId: testUserId },
          });
          assert(items.length === 3, `Expected 3 items, got ${items.length}`);
        },
      },
      {
        name: "add_to_watchlist prevents duplicates",
        fn: async () => {
          await clearWatchlist();
          // Add first time
          await addToWatchlistTool.run({ titles: ["Pulp Fiction"] }, context);
          // Try to add again
          const out = await addToWatchlistTool.run(
            { titles: ["Pulp Fiction"] },
            context
          );
          assert(
            out.includes("Already in your watchlist") || out.includes("ℹ️"),
            "Expected duplicate message"
          );

          const items = await prisma.watchlistItem.findMany({
            where: { userId: testUserId },
          });
          assert(
            items.length === 1,
            `Expected only 1 item (no duplicate), got ${items.length}`
          );
        },
      },
      {
        name: "add_to_watchlist with userRating",
        fn: async () => {
          await clearWatchlist();
          const out = await addToWatchlistTool.run(
            { titles: ["Fight Club"], userRating: 9 },
            context
          );
          assert(out.includes("✅"), "Expected success indicator");

          const item = await prisma.watchlistItem.findFirst({
            where: { userId: testUserId },
          });
          assert(item !== null, "Expected item to exist");
          assert(
            item.userRating === 9,
            `Expected userRating 9, got ${item.userRating}`
          );
        },
      },
      {
        name: "add_to_watchlist handles empty titles",
        fn: async () => {
          const out = await addToWatchlistTool.run({ titles: [] }, context);
          assert(
            out.includes("No movie titles provided") ||
              out.includes("No valid"),
            "Expected error message for empty titles"
          );
        },
      },

      // ─────────────────────────────────────────────────────────────────────
      // get_watchlist tests
      // ─────────────────────────────────────────────────────────────────────
      {
        name: "get_watchlist returns empty message when no items",
        fn: async () => {
          await clearWatchlist();
          const out = await getWatchlistTool.run({}, context);
          assert(
            out.includes("empty") || out.includes("Empty"),
            "Expected empty watchlist message"
          );
        },
      },
      {
        name: "get_watchlist returns saved movies",
        fn: async () => {
          await clearWatchlist();
          await addToWatchlistTool.run(
            { titles: ["Gladiator", "Braveheart"] },
            context
          );

          const out = await getWatchlistTool.run({}, context);
          
          // Verify output contains movie titles (case-insensitive)
          assert(out.toLowerCase().includes("gladiator"), "Expected Gladiator in output");
          assert(out.toLowerCase().includes("braveheart"), "Expected Braveheart in output");
          
          // Verify database has correct count
          const items = await prisma.watchlistItem.findMany({
            where: { userId: testUserId },
          });
          assert(items.length === 2, `Expected 2 items in database, got ${items.length}`);
        },
      },
      {
        name: "get_watchlist sortBy=userRating works",
        fn: async () => {
          await clearWatchlist();
          // Add movies directly with different ratings to avoid OMDB lookup variability
          await prisma.watchlistItem.create({
            data: {
              userId: testUserId,
              title: "Low Rated Movie",
              userRating: 3,
            },
          });
          await prisma.watchlistItem.create({
            data: {
              userId: testUserId,
              title: "High Rated Movie",
              userRating: 9,
            },
          });

          const out = await getWatchlistTool.run(
            { sortBy: "userRating" },
            context
          );
          
          // Both movies should appear in output
          assert(out.includes("High Rated Movie"), "Should include High Rated Movie");
          assert(out.includes("Low Rated Movie"), "Should include Low Rated Movie");
          
          // High Rated Movie (9) should come before Low Rated Movie (3) in the output
          const highIndex = out.indexOf("High Rated Movie");
          const lowIndex = out.indexOf("Low Rated Movie");
          assert(
            highIndex !== -1 && lowIndex !== -1,
            "Both movies should be found in output"
          );
          assert(
            highIndex < lowIndex,
            `Expected High Rated Movie (9) before Low Rated Movie (3) when sorted by userRating. High index: ${highIndex}, Low index: ${lowIndex}`
          );
        },
      },

      // ─────────────────────────────────────────────────────────────────────
      // remove_from_watchlist tests
      // ─────────────────────────────────────────────────────────────────────
      {
        name: "remove_from_watchlist removes existing movie",
        fn: async () => {
          await clearWatchlist();
          await addToWatchlistTool.run({ titles: ["Forrest Gump"] }, context);

          const out = await removeFromWatchlistTool.run(
            { titles: ["Forrest Gump"] },
            context
          );
          assert(out.includes("✅"), "Expected success indicator");
          assert(
            out.toLowerCase().includes("removed"),
            "Expected removed message"
          );

          const items = await prisma.watchlistItem.findMany({
            where: { userId: testUserId },
          });
          assert(
            items.length === 0,
            `Expected 0 items after removal, got ${items.length}`
          );
        },
      },
      {
        name: "remove_from_watchlist handles non-existent movie",
        fn: async () => {
          await clearWatchlist();
          const out = await removeFromWatchlistTool.run(
            { titles: ["NonExistent Movie 12345"] },
            context
          );
          assert(
            out.includes("Not in your watchlist") || out.includes("ℹ️"),
            "Expected not found message"
          );
        },
      },
      {
        name: "remove_from_watchlist removes multiple movies",
        fn: async () => {
          await clearWatchlist();
          // Add movies directly to avoid OMDB title normalization
          await prisma.watchlistItem.createMany({
            data: [
              { userId: testUserId, title: "Movie One" },
              { userId: testUserId, title: "Movie Two" },
              { userId: testUserId, title: "Movie Three" },
            ],
          });

          const out = await removeFromWatchlistTool.run(
            { titles: ["Movie One", "Movie Two"] },
            context
          );
          assert(out.includes("✅"), "Expected success indicator");

          const items = await prisma.watchlistItem.findMany({
            where: { userId: testUserId },
          });
          assert(
            items.length === 1,
            `Expected 1 item remaining, got ${items.length}`
          );
          assert(
            items[0].title === "Movie Three",
            `Expected Movie Three to remain, got ${items[0].title}`
          );
        },
      },

      // ─────────────────────────────────────────────────────────────────────
      // rate_watchlist_movie tests
      // ─────────────────────────────────────────────────────────────────────
      {
        name: "rate_watchlist_movie rates an existing movie",
        fn: async () => {
          await clearWatchlist();
          await addToWatchlistTool.run(
            { titles: ["Schindler's List"] },
            context
          );

          const out = await rateWatchlistMovieTool.run(
            { title: "Schindler's List", rating: 10 },
            context
          );
          assert(out.includes("✅"), "Expected success indicator");
          assert(out.includes("10/10"), "Expected rating in output");

          const item = await prisma.watchlistItem.findFirst({
            where: { userId: testUserId },
          });
          assert(item !== null, "Expected item to exist");
          assert(
            item.userRating === 10,
            `Expected userRating 10, got ${item.userRating}`
          );
        },
      },
      {
        name: "rate_watchlist_movie handles movie not in watchlist",
        fn: async () => {
          await clearWatchlist();
          const out = await rateWatchlistMovieTool.run(
            { title: "Random Movie Not Added", rating: 5 },
            context
          );
          assert(
            out.includes("not in your watchlist"),
            "Expected not in watchlist message"
          );
        },
      },
      {
        name: "rate_watchlist_movie validates rating range",
        fn: async () => {
          await clearWatchlist();
          await addToWatchlistTool.run({ titles: ["Jaws"] }, context);

          // Test rating too high (should clamp to 10)
          await rateWatchlistMovieTool.run(
            { title: "Jaws", rating: 15 },
            context
          );
          let item = await prisma.watchlistItem.findFirst({
            where: { userId: testUserId },
          });
          assert(
            item?.userRating === 10,
            `Expected clamped rating 10, got ${item?.userRating}`
          );

          // Test rating too low (should clamp to 1)
          await rateWatchlistMovieTool.run(
            { title: "Jaws", rating: -5 },
            context
          );
          item = await prisma.watchlistItem.findFirst({
            where: { userId: testUserId },
          });
          assert(
            item?.userRating === 1,
            `Expected clamped rating 1, got ${item?.userRating}`
          );
        },
      },
      {
        name: "rate_watchlist_movie updates existing rating",
        fn: async () => {
          await clearWatchlist();
          await addToWatchlistTool.run(
            { titles: ["Alien"], userRating: 7 },
            context
          );

          // Update the rating
          await rateWatchlistMovieTool.run(
            { title: "Alien", rating: 9 },
            context
          );

          const item = await prisma.watchlistItem.findFirst({
            where: { userId: testUserId },
          });
          assert(
            item?.userRating === 9,
            `Expected updated rating 9, got ${item?.userRating}`
          );
        },
      },

      // ─────────────────────────────────────────────────────────────────────
      // mark_as_watched tests
      // ─────────────────────────────────────────────────────────────────────
      {
        name: "mark_as_watched marks movie as watched",
        fn: async () => {
          await clearWatchlist();
          await prisma.watchlistItem.create({
            data: { userId: testUserId, title: "Test Movie", watched: false },
          });

          const out = await markAsWatchedTool.run(
            { titles: ["Test Movie"], watched: true },
            context
          );
          assert(out.includes("✅"), "Expected success indicator");
          assert(out.includes("watched"), "Expected watched status in output");

          const item = await prisma.watchlistItem.findFirst({
            where: { userId: testUserId },
          });
          assert(item?.watched === true, "Expected watched to be true");
        },
      },
      {
        name: "mark_as_watched marks movie as unwatched",
        fn: async () => {
          await clearWatchlist();
          await prisma.watchlistItem.create({
            data: { userId: testUserId, title: "Seen Movie", watched: true },
          });

          const out = await markAsWatchedTool.run(
            { titles: ["Seen Movie"], watched: false },
            context
          );
          assert(out.includes("⏳"), "Expected unwatched indicator");

          const item = await prisma.watchlistItem.findFirst({
            where: { userId: testUserId },
          });
          assert(item?.watched === false, "Expected watched to be false");
        },
      },
      {
        name: "mark_as_watched handles non-existent movie",
        fn: async () => {
          await clearWatchlist();
          const out = await markAsWatchedTool.run(
            { titles: ["NonExistent Movie"] },
            context
          );
          assert(
            out.includes("Not in your watchlist"),
            "Expected not found message"
          );
        },
      },

      // ─────────────────────────────────────────────────────────────────────
      // get_watchlist with watched filter tests
      // ─────────────────────────────────────────────────────────────────────
      {
        name: "get_watchlist shows watched status indicators",
        fn: async () => {
          await clearWatchlist();
          await prisma.watchlistItem.create({
            data: { userId: testUserId, title: "Watched Film", watched: true },
          });
          await prisma.watchlistItem.create({
            data: {
              userId: testUserId,
              title: "Unwatched Film",
              watched: false,
            },
          });

          const out = await getWatchlistTool.run({}, context);
          
          // Verify both movies are present
          assert(out.includes("Watched Film"), "Should show watched movie");
          assert(out.includes("Unwatched Film"), "Should show unwatched movie");
          
          // Verify status indicators are used (emoji-based, format-independent)
          assert(out.includes("✅"), "Should have watched indicator (✅)");
          assert(out.includes("⏳"), "Should have unwatched indicator (⏳)");
          
          // Verify different status for each movie by checking database state
          const items = await prisma.watchlistItem.findMany({
            where: { userId: testUserId },
            orderBy: { title: "asc" },
          });
          assert(items.length === 2, "Should have 2 items");
          const unwatchedItem = items.find(i => i.title === "Unwatched Film");
          const watchedItem = items.find(i => i.title === "Watched Film");
          assert(unwatchedItem?.watched === false, "Unwatched Film should have watched=false");
          assert(watchedItem?.watched === true, "Watched Film should have watched=true");
        },
      },
      {
        name: "get_watchlist filters by watched=false",
        fn: async () => {
          await clearWatchlist();
          await prisma.watchlistItem.create({
            data: { userId: testUserId, title: "Watched Film", watched: true },
          });
          await prisma.watchlistItem.create({
            data: {
              userId: testUserId,
              title: "Unwatched Film",
              watched: false,
            },
          });

          const out = await getWatchlistTool.run({ watched: false }, context);
          
          // Should include unwatched movie
          assert(out.includes("Unwatched Film"), "Should include unwatched movie");
          
          // Should NOT include watched movie
          assert(
            !out.includes("Watched Film"),
            "Should not include watched movie when filtering by watched=false"
          );
        },
      },
      {
        name: "get_watchlist filters by watched=true",
        fn: async () => {
          await clearWatchlist();
          await prisma.watchlistItem.create({
            data: { userId: testUserId, title: "Watched Film", watched: true },
          });
          await prisma.watchlistItem.create({
            data: {
              userId: testUserId,
              title: "Unwatched Film",
              watched: false,
            },
          });

          const out = await getWatchlistTool.run({ watched: true }, context);
          
          // Should include watched movie
          assert(out.includes("Watched Film"), "Should include watched movie");
          
          // Should NOT include unwatched movie
          assert(
            !out.includes("Unwatched Film"),
            "Should not include unwatched movie when filtering by watched=true"
          );
        },
      },
      {
        name: "get_watchlist shows celebration when all watched",
        fn: async () => {
          await clearWatchlist();
          await prisma.watchlistItem.create({
            data: { userId: testUserId, title: "Watched Film", watched: true },
          });

          const out = await getWatchlistTool.run({ watched: false }, context);
          assert(
            out.includes("🎉") || out.includes("watched everything"),
            "Expected celebration message when no unwatched"
          );
        },
      },
    ];

    // Run tests sequentially
    const results: TestResult[] = [];
    for (const { name, fn } of testFns) {
      const result = await runTest(name, fn);
      results.push(result);
    }

    // Print results
    console.log("\n─────────────────────────────────────────────────────────");
    console.log("TEST RESULTS");
    console.log("─────────────────────────────────────────────────────────\n");

    const failed = results.filter((r) => !r.ok) as Array<
      Extract<TestResult, { ok: false }>
    >;
    for (const r of results) {
      if (r.ok) {
        console.log(`✓ ${r.name}`);
      } else if (r.error.name === "SkipError") {
        console.log(`↷ ${r.name}\n  ${r.error.message}`);
      } else {
        console.error(`✗ ${r.name}\n  ${r.error.message}`);
      }
    }

    const realFailures = failed.filter((r) => r.error.name !== "SkipError");
    const passed = results.filter((r) => r.ok).length;
    const skipped = failed.filter((r) => r.error.name === "SkipError").length;

    console.log("\n─────────────────────────────────────────────────────────");
    console.log(
      `SUMMARY: ${passed} passed, ${realFailures.length} failed, ${skipped} skipped`
    );
    console.log("─────────────────────────────────────────────────────────\n");

    if (realFailures.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await cleanupTestUser();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
