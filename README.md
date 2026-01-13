# AgentChat

A full-stack AI chat application featuring a tool-using agent, real-time streaming, and a contextual avatar.

## Features

- **Agent Orchestration**: Powered by OpenAI, capable of using tools (Calculator, Search).
- **Tool-Driven**: The agent can perform actions and the UI visualizes this "thinking" process.
- **Streaming**: Real-time text generation and tool activity updates via Server-Sent Events (SSE).
- **Contextual Avatar (X-Factor)**: The agent's avatar reacts to its internal state (Idle, Thinking, Searching, Calculating, Error).
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
OPENAI_API_KEY="your-key-here"
PORT=3001
```

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

## Architecture & Decisions

### Streaming Protocol
We use Server-Sent Events (SSE) for its simplicity in unidirectional streaming. Custom events (`tool_start`, `tool_end`, `content`) allow the frontend to distinguish between text generation and agent actions, enabling the "Contextual Avatar" and "Activity Indicator" features.

### Database
SQLite is used for zero-configuration persistence. Prisma is used for type-safe database access.
*Tradeoff*: We store the final agent response but not the intermediate tool call messages in the database history for this MVP. This simplifies the schema but means "resuming" a conversation might lose the context of *how* an answer was derived if it involved tool usage.

### X-Factor: Contextual Avatar
To make the AI feel more "alive", the avatar changes state:
- **Brain**: General thinking/planning.
- **Magnifying Glass**: Searching the web.
- **Calculator**: Doing math.
- **Alert**: Error state.

This provides immediate visual feedback on what the agent is doing behind the scenes.
