# MovieMate

A full-stack AI chat application featuring a tool-using agent, real-time streaming, and a contextual avatar.

## Features

- **Agent Orchestration**: Powered by OpenAI, capable of using tools (Movie Info Search, Movie Recommendations, Watchlist Management).
- **Movie Recommendations**: Get personalized movie suggestions with IMDb ratings, powered by TasteDive and OMDb APIs.
- **Personal Watchlist**: Save movies to watch later, rate them, mark as watched, and filter your list.
- **Tool-Driven**: The agent can perform actions and the UI visualizes this "thinking" process.
- **Streaming**: Real-time text generation and tool activity updates via Server-Sent Events (SSE).
- **Contextual Avatar**: The agent's avatar reacts to its internal state (Idle, Thinking, Fetching Movies, Searching, Calculating, Error).
- **Persistence**: SQLite database stores users, conversations, messages, and watchlist items.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: SQLite with Prisma ORM.
- **AI**: OpenAI API.

## Setup & Run

### Prerequisites
- Node.js (v18+)
- NPM

### 1. Backend Setup

```bash
cd server
npm install
```

**Environment Variables:**
Create `server/.env`:
```
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="your-openai-key"
TASTE_DIVE_API_KEY="your-tastedive-key"
OMDB_API_KEY="your-omdb-key"
PORT=3001
```

> **Note:** Get API keys from:
> - OpenAI: https://platform.openai.com/api-keys
> - TasteDive: https://tastedive.com/read/api
> - OMDb: https://www.omdbapi.com/apikey.aspx

**Database Setup:**
```bash
npx prisma migrate dev --name init
```

**Run Server:**
```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## Testing

The project includes comprehensive tests with **dynamic test discovery** - new tests are automatically detected and run without modifying the test runner scripts.

### Test Structure

```
tests/                          # Root-level test runners
├── run-all.sh                  # Run all tests (dynamically discovers tests)
├── run-server-tests.sh         # Server unit tests (dynamically discovers *.test.ts)
└── integration/                # Integration tests (dynamically discovers *.test.sh)
    ├── chat.test.sh
    ├── movies.test.sh
    └── watchlist.test.sh

server/tests/                   # Server unit tests (auto-discovered)
├── conversations-api.test.ts   # API tests (requires server)
├── movie-tools.test.ts         # Movie tools tests
└── watchlist-tools.test.ts     # Watchlist tools tests

client/src/                     # Client unit tests (colocated)
├── components/*.test.tsx
└── context/*.test.tsx
```

### Running Tests

**List All Available Tests:**
```bash
./tests/run-all.sh --list
./tests/run-server-tests.sh --list
```

**Run All Tests:**
```bash
./tests/run-all.sh                    # Run everything
./tests/run-all.sh --unit-only        # Only unit tests (no server needed)
./tests/run-all.sh --integration-only # Only integration tests (server needed)
```

**Server Unit Tests:**
```bash
./tests/run-server-tests.sh           # Run all server unit tests
./tests/run-server-tests.sh movie     # Run only movie-tools tests
./tests/run-server-tests.sh watchlist # Run only watchlist-tools tests
./tests/run-server-tests.sh conversations # Run only API tests (requires server)
```

**Client Unit Tests:**
```bash
cd client && npm run test:run
# Or with watch mode:
cd client && npm test
```

**Integration Tests (requires server running on localhost:3001):**
```bash
# Start the server first
cd server && npm run dev

# In another terminal
./tests/integration/chat.test.sh
./tests/integration/movies.test.sh "Inception"
./tests/integration/watchlist.test.sh
```

### Adding New Tests

Tests are **automatically discovered**:
- **Server unit tests**: Add `server/tests/my-feature.test.ts` → automatically included
- **Integration tests**: Add `tests/integration/my-feature.test.sh` → automatically included

No need to modify the test runner scripts!

### Test Requirements

| Test Type | Requirements |
|-----------|-------------|
| Server unit tests | `TASTE_DIVE_API_KEY` and `OMDB_API_KEY` in `server/.env` |
| Client unit tests | None |
| Integration tests | Server running on `localhost:3001` |
| Conversations API tests | Server running on `localhost:3001` |

## Mock Agent Mode

The app includes a **mock agent** that activates automatically when OpenAI is unavailable, allowing you to demo the app without an API key.

### When Does Mock Mode Activate?

| Condition | Result |
|-----------|--------|
| `OPENAI_API_KEY` not set or `"dummy"` | → Mock Mode |
| OpenAI API returns 429 (rate limit) | → Mock Mode |
| OpenAI API returns any error | → Mock Mode |
| OpenAI API works normally | → Real LLM Mode |

### Using Mock Mode

The mock uses **keyword patterns** instead of AI understanding:

| What You Type | What Happens |
|--------------|--------------|
| `watchlist: Inception` | Adds "Inception" to your watchlist |
| `watchlist: The Matrix` | Adds "The Matrix" to your watchlist |
| `search anything` | Triggers movie info search (placeholder) |
| `Inception` | Treats as movie query → returns recommendations |
| `sci-fi movies` | Treats as movie query → returns recommendations |

**Examples:**
```
You: watchlist: Pulp Fiction
→ Adds Pulp Fiction to your watchlist (REAL database write)

You: Inception
→ Returns movies similar to Inception (REAL TasteDive + OMDB API calls)
```

### What's Real vs. Mocked?

**Only the LLM decision-making is mocked.** Everything else is real:

- ✅ **Real**: Database operations (watchlist saves, user data)
- ✅ **Real**: External APIs (TasteDive recommendations, OMDB ratings)
- ✅ **Real**: Tool execution (all registered tools work)
- ❌ **Mocked**: Natural language understanding (uses keyword matching)
- ❌ **Mocked**: Conversational responses (returns raw tool output)

### Limitations vs. Real LLM

With mock mode, you lose:
- Natural language understanding (*"Add that one to my list"* won't work)
- Multi-turn conversation context
- Intelligent tool selection
- Natural language response generation

The mock is designed for **demo and development** purposes.

## Architecture & Decisions

### Streaming Protocol
We use Server-Sent Events (SSE) for its simplicity in unidirectional streaming. Custom events (`tool_start`, `tool_end`, `content`) allow the frontend to distinguish between text generation and agent actions, enabling the "Contextual Avatar" and "Activity Indicator" features.

### Database
SQLite is used for zero-configuration persistence. Prisma is used for type-safe database access.
*Tradeoff*: We store the final agent response but not the intermediate tool call messages in the database history for this MVP. This simplifies the schema but means "resuming" a conversation might lose the context of *how* an answer was derived if it involved tool usage.

### Contextual Avatar
To make the AI feel more "alive", the avatar changes state:
- **Brain**: General thinking/planning.
- **Magnifying Glass**: Searching for movie info online.
- **Bookmark**: Managing watchlist.
- **Film**: Movie recommendations/ratings.
- **Alert**: Error state.

This provides immediate visual feedback on what the agent is doing behind the scenes.
