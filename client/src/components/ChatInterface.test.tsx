import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from './ChatInterface';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { api } from '../api';

// Mock dependencies
vi.mock('../api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('./ChatLayout', () => ({
  ChatLayout: ({ children, agentState }: any) => (
    <div data-testid="chat-layout" data-agent-state={agentState}>
      {children}
    </div>
  ),
}));

vi.mock('./MessageBubble', () => ({
  MessageBubble: ({ role, content }: any) => (
    <div data-testid={`message-${role}`}>{content}</div>
  ),
}));

vi.mock('./ActivityIndicator', () => ({
  ActivityIndicator: ({ activities }: any) => (
    <div data-testid="activity-indicator">
      {activities.length} activities
    </div>
  ),
}));

vi.mock('./Avatar', () => ({
  Avatar: ({ state }: any) => <div data-testid="avatar" data-state={state} />,
}));

describe('ChatInterface Component', () => {
  const mockUser = { id: 'user123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('user', JSON.stringify(mockUser));
    global.fetch = vi.fn();
  });

  const renderWithAuth = () => {
    return render(
      <ToastProvider>
        <AuthProvider>
          <ChatInterface />
        </AuthProvider>
      </ToastProvider>
    );
  };

  describe('Initial Render', () => {
    it('renders the chat interface', async () => {
      renderWithAuth();
      await waitFor(() => {
        expect(screen.getByTestId('chat-layout')).toBeInTheDocument();
      });
    });

    it('displays welcome message when no messages', async () => {
      renderWithAuth();
      await waitFor(() => {
        expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
      });
    });

    it('renders input field with placeholder', async () => {
      renderWithAuth();
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Message AgentChat...');
        expect(input).toBeInTheDocument();
      });
    });

    it('shows submit button', async () => {
      renderWithAuth();
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('displays disclaimer text', async () => {
      renderWithAuth();
      await waitFor(() => {
        expect(screen.getByText('AI can make mistakes. Please check important info.')).toBeInTheDocument();
      });
    });
  });

  describe('Message Input', () => {
    it('allows typing in the input field', async () => {
      const user = userEvent.setup();
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message AgentChat...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Message AgentChat...') as HTMLInputElement;
      await user.type(input, 'Hello AI');

      expect(input.value).toBe('Hello AI');
    });

    it('submit button is disabled when input is empty', async () => {
      renderWithAuth();

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Message AgentChat...');
        expect(input).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const submitButton = buttons[buttons.length - 1]; // Last button is the submit button
      expect(submitButton).toBeDisabled();
    });

    it('submit button is enabled when input has text', async () => {
      const user = userEvent.setup();
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Message AgentChat...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Message AgentChat...');
      await user.type(input, 'Test message');

      const buttons = screen.getAllByRole('button');
      const submitButton = buttons[buttons.length - 1];
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Component Integration', () => {
    it('renders with all child components', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('chat-layout')).toBeInTheDocument();
        expect(screen.getByTestId('avatar')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Message AgentChat...')).toBeInTheDocument();
      });
    });

    it('initial avatar state is idle', async () => {
      renderWithAuth();

      await waitFor(() => {
        const layout = screen.getByTestId('chat-layout');
        expect(layout.getAttribute('data-agent-state')).toBe('idle');
      });
    });

    it('renders empty message list initially', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.queryByTestId('message-user')).not.toBeInTheDocument();
        expect(screen.queryByTestId('message-assistant')).not.toBeInTheDocument();
      });
    });
  });

  describe('UI Elements', () => {
    it('displays welcome content correctly', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
        expect(screen.getByText('I can perform calculations, search the web, and recommend movies.')).toBeInTheDocument();
      });
    });

    it('has input field present', async () => {
      renderWithAuth();

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Message AgentChat...');
        expect(input).toBeInTheDocument();
      });
    });
  });
});
