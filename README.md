# MovieMate

A full-stack AI Movie themed chat application featuring a tool-using agent, real-time streaming, recommendation system.

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

**View Database (Prisma Studio):**
```bash
# From the server directory
npx prisma studio
```
This opens a visual database browser at `http://localhost:5555` where you can view, edit, and manage your data.

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

The project includes comprehensive tests with **dynamic test discovery**.

### Quick Start

```bash
# Run all tests
./tests/run-all.sh

# Run only unit tests (no server needed)
./tests/run-all.sh --unit-only

# Run only integration tests (requires server on localhost:3001)
./tests/run-all.sh --integration-only

# List all available tests
./tests/run-all.sh --list
```

### Test Structure

```
tests/                          # Root-level test runners
├── run-all.sh                  # Run all tests
├── run-server-tests.sh         # Server unit tests
└── integration/                # Integration tests
    ├── chat.test.sh
    ├── movies.test.sh
    └── watchlist.test.sh

server/tests/                   # Server unit tests
├── conversations-api.test.ts
├── movie-tools.test.ts
└── watchlist-tools.test.ts

client/src/                     # Client unit tests (colocated)
├── components/*.test.tsx
└── context/*.test.tsx
```

### Adding New Tests

Tests are **automatically discovered**:
- **Server unit tests**: Add `server/tests/my-feature.test.ts` → automatically included
- **Integration tests**: Add `tests/integration/my-feature.test.sh` → automatically included

## Mock Agent Mode

The app includes a **mock agent** that activates automatically when OpenAI is unavailable, allowing you to demo the app without an API key.

| Condition | Result |
|-----------|--------|
| `OPENAI_API_KEY` not set or `"dummy"` | → Mock Mode |
| OpenAI API returns any error | → Mock Mode |
| OpenAI API works normally | → Real LLM Mode |

**Only the LLM decision-making is mocked.** Database operations, external APIs (TasteDive, OMDB), and tool execution are all **real**.

> 📖 For detailed mock mode usage and keyword patterns, see [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md#2-mock-fallback-strategy).

## Documentation

For deeper technical information, see the `/docs` directory:

| Document | Description |
|----------|-------------|
| [PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | Database schema, API documentation, client architecture, agent tools, and core logic |
| [ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md) | Design rationale, tradeoffs, and V2 roadmap |
