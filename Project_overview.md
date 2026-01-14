# Project Overview

## Database

### Architecture & Storage
The project uses **SQLite** as its relational database management system.
- **File-based**: The entire database is stored in a single file located at `server/prisma/dev.db`.
- **ORM**: We use **Prisma** to interact with the database, providing a type-safe API and schema management.
- **Migration**: Database schema changes are managed via Prisma Migrations (stored in `server/prisma/migrations`).

### Database Migrations
Database schema changes are managed via **Prisma Migrations**.
1.  **Modify Schema**: Edit `server/prisma/schema.prisma` to define new models or fields.
2.  **Create Migration**: Run `npx prisma migrate dev --name <migration_name>` in the `server` directory. This:
    *   Generates a SQL migration file in `server/prisma/migrations`.
    *   Updates the local SQLite database (`dev.db`).
    *   Regenerates the Prisma Client.
3.  **Apply Migrations**: Migrations are applied automatically when running `migrate dev`.

### Entities & Relations

The data model consists of four core entities with the following relationships:

**User** 1 ↔ N **Conversation** 1 ↔ N **Message**

**User** 1 ↔ N **WatchlistItem**

#### 1. User
Represents the authenticated end-user.
- **`id`** (UUID): Unique primary key.
- **`email`** (String): Unique identifier for login.
- **`name`** (String?): Display name (extracted from email).
- **`createdAt`**: Timestamp of registration.
- **Relations**: Has many `conversations`, has many `watchlistItems`.

#### 2. Conversation
Represents a chat session thread.
- **`id`** (UUID): Unique primary key.
- **`title`**: Display title for the chat history.
- **`userId`**: Foreign key to User.
- **`createdAt` / `updatedAt`**: Lifecycle timestamps.
- **Relations**:
  - Belongs to one `user`.
  - Has many `messages`.

#### 3. Message
Represents a single exchange within a chat.
- **`id`** (UUID): Unique primary key.
- **`role`**: Sender type (`"user"` or `"assistant"`).
- **`content`**: The text body of the message.
- **`conversationId`**: Foreign key to Conversation.
- **`createdAt`**: Timestamp of the message.
- **Relations**: Belongs to one `conversation`.

#### 4. WatchlistItem
Represents a movie saved to a user's personal watchlist.
- **`id`** (UUID): Unique primary key.
- **`userId`**: Foreign key to User.
- **`title`** (String): Movie title (normalized from OMDB).
- **`imdbRating`** (Float?): IMDb rating at time of save.
- **`plot`** (String?): Plot summary from OMDB.
- **`userRating`** (Int?): User's personal rating (1-10 scale).
- **`watched`** (Boolean): Whether the user has watched this movie (default: false).
- **`addedAt`**: Timestamp when added to watchlist.
- **Relations**: Belongs to one `user`.
- **Constraints**: Unique on `(userId, title)` to prevent duplicates.

## API Documentation

The server exposes a RESTful API with the following endpoints.

**Base URL**: `http://localhost:3001`

### 1. Authentication
*   **POST** `/api/auth/login`
    *   **Body**: `{ "email": "user@example.com" }`
    *   **Description**: Logs in a user. If the email doesn't exist, a new user is created. The user's name is automatically extracted from the email.
    *   **Response**: Returns the user object.

### 2. Conversations
*   **POST** `/api/conversations`
    *   **Body**: `{ "userId": "uuid", "title": "optional title" }`
    *   **Description**: Creates a new conversation for a specific user.
*   **GET** `/api/conversations/user/:userId`
    *   **Description**: Lists all conversations belonging to a user, sorted by most recently updated.
*   **GET** `/api/conversations/:id`
    *   **Description**: Retrieves a specific conversation including all its messages.
*   **DELETE** `/api/conversations/:id`
    *   **Description**: Permanently deletes a conversation and all associated messages.

### 3. Chat (Streaming)
*   **POST** `/api/chat`
    *   **Body**:
        ```json
        {
          "message": "Hello AI",
          "conversationId": "uuid",
          "userId": "uuid"
        }
        ```
    *   **Description**: Main endpoint for interacting with the AI agent.
    *   **Response**: **Server-Sent Events (SSE)** stream.
        *   `event: content`: Partial text chunks of the AI's response.
        *   `event: tool_start`: Notification that the AI is using a tool (e.g., calculator, search).
        *   `event: tool_end`: Result of the tool execution.
        *   `event: done`: Signal that the response is complete.

### 4. System
*   **GET** `/health`
    *   **Description**: Simple health check endpoint returning `{ status: 'ok' }`.

## Client Architecture

The frontend is built using **React** (v18+) with **TypeScript**, bundled by **Vite**.

### 1. State Management
We use React's **Context API** for managing global state, avoiding "prop drilling" and complex external libraries like Redux.
*   **`AuthContext`**: Manages the user's login session, persisting the user in `localStorage` so they stay logged in on refresh.
*   **`ToastContext`**: Provides a global mechanism to display temporary success or error notification popups.

### 2. Key Components
The UI is composed of functional components:
*   **`ChatInterface.tsx`**: The main container for the chat view. It handles:
    *   Fetching chat history.
    *   Sending messages.
    *   **Handling SSE Streams**: Reads the `ReadableStream` from the API to display AI responses character-by-character in real-time.
*   **`ChatLayout.tsx`**: Defines the overall page structure, including the collapsible sidebar for conversation history and the main chat area.
*   **`MessageBubble.tsx`**: Renders individual messages, styling them differently based on whether they are from the "user" or "assistant".
*   **`Avatar.tsx`**: A visual representation of the agent, which changes states (`idle`, `thinking`, `tool:search`, `tool:calculator`, `error`) based on real-time events.

### 3. Styling
*   **Tailwind CSS**: Used for utility-first styling. This allows for rapid UI development with pre-defined classes for layout (`flex`, `grid`), spacing (`p-4`, `m-2`), colors (`bg-blue-500`), and responsiveness.
*   **Lucide React**: Provides the icon set (e.g., Send button, Sidebar toggle) used throughout the application.

### 4. Data Fetching
*   **Axios**: A configured instance (`api.ts`) is used for standard REST calls (Login, History).
*   **Fetch API**: The native `fetch` API is explicitly used for the Chat endpoint to support **Streaming** (reading the response body as a stream), which Axios does not support as natively or intuitively for this specific use case.

## Agent Tools

The AI agent has access to a registry of tools that allow it to perform actions beyond simple text generation.

### 1. Calculator
*   **Description**: Performs basic arithmetic operations.
*   **Operations**: `add`, `subtract`, `multiply`, `divide`.
*   **Functionality**: Allows the agent to accurately compute mathematical expressions requested by the user.

### 2. Movie Tools
A suite of tools for movie discovery and information, utilizing external APIs (TasteDive and OMDB).
*   **`movie_recommendations`**: The primary tool for suggesting movies. It combines similarity data with IMDb ratings to provide "best-rated" suggestions similar to a user's query.
*   **`movie_ratings`**: specifically looks up IMDb ratings and plot summaries for known titles.
*   **`movie_similarity`**: Finds similar movies based on content (without rating bias).

### 3. Search
*   **Description**: A general-purpose search tool.
*   **Functionality**: (Currently mocked) simulates searching the web to retrieve information about current events or specific queries.

### 4. Watchlist Tools
A suite of tools for managing a user's personal movie watchlist. These tools perform **actions** (create, read, update, delete) on the database.
*   **`add_to_watchlist`**: Adds movies to the user's watchlist. Automatically fetches IMDb rating and plot from OMDB. Optionally accepts an initial user rating.
*   **`get_watchlist`**: Retrieves the user's saved movies. Supports sorting by date added, IMDb rating, or user rating. Can filter by watched status (e.g., "show unwatched movies").
*   **`remove_from_watchlist`**: Removes movies from the watchlist by title.
*   **`rate_watchlist_movie`**: Sets or updates the user's personal rating (1-10) for a movie in their watchlist.
*   **`mark_as_watched`**: Marks movies as watched or unwatched (e.g., "I watched Inception").

## Agent Core Logic

The intelligence of the system is encapsulated in `server/src/agent/service.ts`, which orchestrates the interaction between the user, the OpenAI API, and the available tools.

### 1. The Orchestration Loop
The `runAgent` function is an asynchronous generator that manages the conversation flow:
1.  **System Initialization**: Prepends the `SYSTEM_PROMPT` to the conversation history to define the agent's persona and safety boundaries.
2.  **API Call**: Sends the conversation history (including tool definitions) to the OpenAI API (`gpt-4o-mini`).
3.  **Streaming Response**: As the model generates tokens, they are immediately yielded to the frontend as `content` events.
4.  **Tool Execution**:
    *   If the model decides to call a tool (e.g., `tool_calls`), the loop pauses to execute the requested function (e.g., calculating a number or fetching movie data).
    *   Tools receive a `ToolContext` object containing user-scoped data (e.g., `userId`) for personalized operations like watchlist management.
    *   It yields `tool_start` and `tool_end` events so the frontend can display activity indicators.
    *   The tool's result is added back to the conversation history as a `tool` role message.
5.  **Recursion**: The loop continues, sending the updated history (with tool results) back to the model so it can generate a final natural language response based on the new data.

### 2. Mock Fallback Strategy
To ensure reliability (e.g., in case of API rate limits, network errors, or missing keys), the system implements a robust fallback mechanism (`runMockAgent`):
*   If the primary OpenAI call fails, the system automatically switches to a local mock implementation.
*   This mock agent uses simple heuristics (keyword matching) to simulate the behavior of the real agent, including "thinking" delays and "fake" tool executions for the calculator and search, ensuring the UI remains functional for demonstration purposes even without a live LLM connection.
