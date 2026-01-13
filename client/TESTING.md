# Frontend Testing Guide

This project uses **Vitest** and **React Testing Library** for testing the frontend components.

## Quick Start

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode (auto-rerun on file changes)
npm test

# Open the Vitest UI for visual test management
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Using the helper script
./run-tests.sh          # Run all tests once
./run-tests.sh watch    # Run in watch mode
./run-tests.sh ui       # Open test UI
./run-tests.sh coverage # Run with coverage
```

## Test Coverage

The following components have comprehensive test coverage:

### ✅ Avatar Component (`src/components/Avatar.test.tsx`)
- Tests all avatar states (idle, thinking, tool:search, tool:calculator, error)
- Tests all size variations (sm, md, lg)
- Tests styling and animations
- **10 tests**

### ✅ ActivityIndicator Component (`src/components/ActivityIndicator.test.tsx`)
- Tests rendering of different activity types (tool_start, tool_end, error)
- Tests input/output display
- Tests styling and icons
- **15 tests**

### ✅ AuthContext (`src/context/AuthContext.test.tsx`)
- Tests login and logout functionality
- Tests localStorage persistence
- Tests error handling
- Tests loading states
- **13 tests**

### ✅ ChatInterface Component (`src/components/ChatInterface.test.tsx`)
- Tests initial rendering and UI elements
- Tests message input and submission
- Tests component integration
- **13 tests**

## Test Structure

```
client/
├── src/
│   ├── test/
│   │   └── setup.ts           # Global test configuration
│   ├── components/
│   │   ├── Avatar.tsx
│   │   ├── Avatar.test.tsx    # Component tests
│   │   └── ...
│   └── context/
│       ├── AuthContext.tsx
│       └── AuthContext.test.tsx
├── vite.config.ts             # Vitest configuration
└── TESTING.md                 # This file
```

## Writing Tests

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing Best Practices

1. **Use descriptive test names** - Test names should clearly state what they're testing
2. **Test user behavior, not implementation** - Focus on what the user sees and does
3. **Keep tests independent** - Each test should be able to run on its own
4. **Use appropriate queries** - Prefer `getByRole`, `getByLabelText`, `getByText` over `getByTestId`
5. **Mock external dependencies** - API calls, contexts, and child components should be mocked

## Troubleshooting

### Tests not running?
```bash
# Make sure dependencies are installed
npm install

# Try clearing the cache
npm run test:run -- --clearCache
```

### Tests timing out?
- Increase timeout in test: `{ timeout: 10000 }`
- Check for unresolved promises in components

### Import errors?
- Verify the mock paths in test files match the actual import paths
- Check that all test dependencies are installed

## Continuous Integration

To run tests in CI/CD pipelines:

```bash
npm run test:run
```

This command runs all tests once and exits, making it perfect for CI environments.

## Next Steps

To improve test coverage:
1. Add integration tests for full user flows
2. Add E2E tests with Playwright or Cypress
3. Increase coverage for edge cases
4. Add visual regression tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
