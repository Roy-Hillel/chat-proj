# AgentChat

A full-stack AI chat application featuring a tool-using agent, real-time streaming, and a contextual avatar.

## Features

- **Agent Orchestration**: Powered by OpenAI, capable of using tools (Calculator, Search, Movie Recommendations).
- **Movie Recommendations**: Get personalized movie suggestions with IMDb ratings, powered by TasteDive and OMDb APIs.
- **Tool-Driven**: The agent can perform actions and the UI visualizes this "thinking" process.
- **Streaming**: Real-time text generation and tool activity updates via Server-Sent Events (SSE).
- **Contextual Avatar**: The agent's avatar reacts to its internal state (Idle, Thinking, Fetching Movies, Searching, Calculating, Error).
- **Persistence**: SQLite database stores users, conversations, and messages.

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

The project includes comprehensive tests for both frontend and backend.

### Test Structure

```
tests/                          # Root-level test runners
├── run-all.sh                  # Run all tests
├── run-server-tests.sh         # Server unit tests only
└── integration/                # Integration tests (require running server)
    ├── chat.test.sh
    └── movies.test.sh

server/tests/                   # Server unit tests
└── movie-tools.test.ts         # Movie tools tests (no LLM required)

client/src/                     # Client unit tests (colocated)
├── components/*.test.tsx
└── context/*.test.tsx
```

### Running Tests

**Run All Tests:**
```bash
./tests/run-all.sh
```

**Server Unit Tests Only (no server required):**
```bash
./tests/run-server-tests.sh "The Matrix"
```

**Client Unit Tests Only:**
```bash
cd client && npm run test:run
# Or with watch mode:
cd client && npm test
```

**Integration Tests (requires server running on localhost:3001):**
```bash
# Start the server first
cd server && npm run dev

# In another terminal, run integration tests
./tests/integration/chat.test.sh
./tests/integration/movies.test.sh "Inception"
```

### Test Requirements

- **Server unit tests**: Require `TASTE_DIVE_API_KEY` and `OMDB_API_KEY` in `server/.env`
- **Client unit tests**: No additional requirements
- **Integration tests**: Require the server running on `localhost:3001`

## Architecture & Decisions

### Streaming Protocol
We use Server-Sent Events (SSE) for its simplicity in unidirectional streaming. Custom events (`tool_start`, `tool_end`, `content`) allow the frontend to distinguish between text generation and agent actions, enabling the "Contextual Avatar" and "Activity Indicator" features.

### Database
SQLite is used for zero-configuration persistence. Prisma is used for type-safe database access.
*Tradeoff*: We store the final agent response but not the intermediate tool call messages in the database history for this MVP. This simplifies the schema but means "resuming" a conversation might lose the context of *how* an answer was derived if it involved tool usage.

### Contextual Avatar
To make the AI feel more "alive", the avatar changes state:
- **Brain**: General thinking/planning.
- **Magnifying Glass**: Searching the web.
- **Calculator**: Doing math.
- **Alert**: Error state.

This provides immediate visual feedback on what the agent is doing behind the scenes.
