import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityIndicator } from './ActivityIndicator';

describe('ActivityIndicator Component', () => {
  describe('Rendering', () => {
    it('returns null when activities array is empty', () => {
      const { container } = render(<ActivityIndicator activities={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders activity header when activities exist', () => {
      const activities = [{
        type: 'tool_start' as const,
        tool: 'search',
        input: { query: 'test' },
        timestamp: Date.now()
      }];
      render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText('Agent Activity')).toBeInTheDocument();
    });

    it('renders multiple activities', () => {
      const activities = [
        {
          type: 'tool_start' as const,
          tool: 'search',
          input: { query: 'test1' },
          timestamp: Date.now()
        },
        {
          type: 'tool_end' as const,
          tool: 'search',
          output: 'result1',
          timestamp: Date.now() + 1000
        }
      ];
      render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText('Running tool: search')).toBeInTheDocument();
      expect(screen.getByText('Tool finished: search')).toBeInTheDocument();
    });
  });

  describe('Tool Start Activity', () => {
    it('displays tool_start with loader icon', () => {
      const activities = [{
        type: 'tool_start' as const,
        tool: 'add_to_watchlist',
        input: { titles: ['The Matrix'] },
        timestamp: Date.now()
      }];
      const { container } = render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText('Running tool: add_to_watchlist')).toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
      expect(container.querySelector('.text-blue-500')).toBeInTheDocument();
    });

    it('displays tool input as JSON', () => {
      const activities = [{
        type: 'tool_start' as const,
        tool: 'search',
        input: { query: 'openai api', limit: 5 },
        timestamp: Date.now()
      }];
      render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText(/query/)).toBeInTheDocument();
      expect(screen.getByText(/openai api/)).toBeInTheDocument();
    });

    it('handles complex input objects', () => {
      const activities = [{
        type: 'tool_start' as const,
        tool: 'search',
        input: { nested: { key: 'value' }, array: [1, 2, 3] },
        timestamp: Date.now()
      }];
      const { container } = render(<ActivityIndicator activities={activities} />);
      const preElement = container.querySelector('pre');
      expect(preElement).toBeInTheDocument();
      expect(preElement?.textContent).toContain('nested');
      expect(preElement?.textContent).toContain('array');
    });
  });

  describe('Tool End Activity', () => {
    it('displays tool_end with check icon', () => {
      const activities = [{
        type: 'tool_end' as const,
        tool: 'add_to_watchlist',
        output: '✅ Added to your watchlist: The Matrix',
        timestamp: Date.now()
      }];
      const { container } = render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText('Tool finished: add_to_watchlist')).toBeInTheDocument();
      expect(container.querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('displays string output correctly', () => {
      const activities = [{
        type: 'tool_end' as const,
        tool: 'search',
        output: 'Search results found',
        timestamp: Date.now()
      }];
      render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText(/Search results found/)).toBeInTheDocument();
    });

    it('displays object output as JSON string', () => {
      const activities = [{
        type: 'tool_end' as const,
        tool: 'search',
        output: { results: ['item1', 'item2'] },
        timestamp: Date.now()
      }];
      render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText(/results/)).toBeInTheDocument();
    });
  });

  describe('Error Activity', () => {
    it('displays error with alert icon', () => {
      const activities = [{
        type: 'error' as const,
        error: 'Tool execution failed',
        timestamp: Date.now()
      }];
      const { container } = render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText('Error: Tool execution failed')).toBeInTheDocument();
      expect(container.querySelector('.text-red-500')).toBeInTheDocument();
    });

    it('applies red text color to error messages', () => {
      const activities = [{
        type: 'error' as const,
        error: 'Network timeout',
        timestamp: Date.now()
      }];
      const { container } = render(<ActivityIndicator activities={activities} />);
      const errorDiv = container.querySelector('.text-red-600');
      expect(errorDiv).toBeInTheDocument();
      expect(errorDiv?.textContent).toContain('Network timeout');
    });
  });

  describe('Styling', () => {
    it('applies correct container styling', () => {
      const activities = [{
        type: 'tool_start' as const,
        tool: 'test',
        input: {},
        timestamp: Date.now()
      }];
      const { container } = render(<ActivityIndicator activities={activities} />);
      expect(container.querySelector('.bg-gray-50')).toBeInTheDocument();
      expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
      expect(container.querySelector('.border-gray-100')).toBeInTheDocument();
    });

    it('uses monospace font for activity details', () => {
      const activities = [{
        type: 'tool_start' as const,
        tool: 'test',
        input: { test: true },
        timestamp: Date.now()
      }];
      const { container } = render(<ActivityIndicator activities={activities} />);
      expect(container.querySelector('.font-mono')).toBeInTheDocument();
    });
  });

  describe('Activity Flow', () => {
    it('displays complete tool execution flow', () => {
      const activities = [
        {
          type: 'tool_start' as const,
          tool: 'get_watchlist',
          input: { sortBy: 'addedAt' },
          timestamp: Date.now()
        },
        {
          type: 'tool_end' as const,
          tool: 'get_watchlist',
          output: '📽️ Your Watchlist (2 movies)',
          timestamp: Date.now() + 100
        }
      ];
      render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText('Running tool: get_watchlist')).toBeInTheDocument();
      expect(screen.getByText('Tool finished: get_watchlist')).toBeInTheDocument();
    });

    it('displays error after tool start', () => {
      const activities = [
        {
          type: 'tool_start' as const,
          tool: 'search',
          input: { query: 'test' },
          timestamp: Date.now()
        },
        {
          type: 'error' as const,
          error: 'API rate limit exceeded',
          timestamp: Date.now() + 50
        }
      ];
      render(<ActivityIndicator activities={activities} />);
      expect(screen.getByText('Running tool: search')).toBeInTheDocument();
      expect(screen.getByText('Error: API rate limit exceeded')).toBeInTheDocument();
    });
  });
});
