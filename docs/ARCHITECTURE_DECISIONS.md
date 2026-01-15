# Architecture Decisions & Tradeoffs

## Database Choice: SQLite with Prisma ORM

### Why This Approach?

The primary driver for choosing **SQLite with Prisma** was **simplicity and tight coupling between code and schema**:

1. **Schema as Code**: Prisma's schema file (`schema.prisma`) serves as a single source of truth. The database structure is version-controlled alongside the application code, making it easy to understand the data model at a glance.

2. **Type Safety**: Prisma generates TypeScript types directly from the schema, eliminating the disconnect between database structure and application code. This catches errors at compile time rather than runtime.

3. **Zero Infrastructure Overhead**: SQLite requires no separate database server—it's a file-based database that lives within the project. This makes local development, testing, and deployment straightforward.

4. **Migration Simplicity**: Schema changes are handled through Prisma migrations, providing a clear audit trail of how the database evolved over time.

---

## What I Did NOT Compromise On

Despite time constraints, I maintained high standards in these critical areas:

### 1. **Clear, Comprehensive Tests**
- Unit and integration tests for core backend functionality
- UI tests validating frontend components and user interactions
- Tests serve as living documentation of expected behavior
- Confidence in refactoring and adding new features

### 2. **Documentation**
- README.md with setup instructions and API overview
- PROJECT_OVERVIEW.md explaining architecture and patterns
- Inline comments where logic is non-obvious

### 3. **LLM Rules & System Prompts**
- Well-defined `.cursorrules` for consistent AI-assisted development
- Clear system prompts for the agent's behavior
- These were the **biggest enablers for fast development**—going from prompt to feature with minimal friction

> **Key Insight**: Investing in tests, docs, and LLM rules upfront dramatically accelerated development velocity. The time "spent" on these foundations was paid back many times over.

---

## Tradeoffs: What Was Simplified

Given the time constraints, the following areas were simplified or deferred:

1. **OpenAI API Usage**: Used the straightforward `/chat/completions` endpoint rather than exploring more advanced features (function calling optimizations, assistants API, streaming responses)

2. **Error Handling**: Basic error handling is in place, but edge cases and retry logic could be more robust

3. **UI Polish**: Focused on functionality over pixel-perfect design

4. **Authentication**: Simple authentication flow without advanced features like password reset, OAuth, or session management

---

## V2 Roadmap: What's Next?

If given a full week, here's what I would build:

### 🔬 Technical Improvements

1. **Deep Dive into OpenAI API**
   - Explore the Assistants API for better conversation management
   - Implement streaming responses for better UX
   - Optimize token usage and response quality
   - Investigate function calling improvements

### 🤝 Social Features

2. **"Invite a Friend" Feature**
   - Allow users to invite friends to watch items from their watchlist
   - Friend receives an alert notification on their next login (identified by email)
   - Creates engagement and makes the app more social/collaborative

3. **Additional Friendly Features**
   - Shared watchlists between users
   - "Watch together" scheduling
   - Activity feed showing what friends are watching

### ✨ Quality & Polish

4. **Comprehensive QA Pass**
   - End-to-end testing of all user flows
   - Verify UX is perfectly seamless
   - Fix minor bugs and edge cases
   - Performance optimization
   - Accessibility audit

5. **Production Hardening**
   - Rate limiting
   - Better error messages
   - Logging and monitoring
   - Security audit

---

## Summary

The architecture prioritized **developer experience and maintainability** through type-safe database access and comprehensive documentation. The investment in tests and LLM rules proved to be a force multiplier for development speed. Future iterations would expand on social features and deepen the OpenAI integration while maintaining the same commitment to code quality.
