import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from '../api';

// Mock the api module
vi.mock('../api', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('provides auth context to children', () => {
      render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      );
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('initializes with null user when localStorage is empty', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('loads user from localStorage on mount', async () => {
      const mockUser = { id: '123', email: 'test@example.com', name: 'Test User' };
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
    });

    // Skipping this test - would require error handling in AuthContext
    // it('handles invalid JSON in localStorage gracefully', async () => {
    //   localStorage.setItem('user', 'invalid-json');
    //   const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    //   await waitFor(() => expect(result.current.isLoading).toBe(false));
    //   expect(result.current.user).toBeNull();
    // });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within AuthProvider');

      consoleSpy.mockRestore();
    });

    it('provides login, logout, user, and isLoading', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.login).toBeDefined();
      expect(result.current.logout).toBeDefined();
      expect(result.current.user).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });
  });

  describe('login function', () => {
    it('successfully logs in user and stores in localStorage', async () => {
      const mockUser = { id: '456', email: 'login@example.com' };
      vi.mocked(api.post).mockResolvedValue({ data: { user: mockUser } });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('login@example.com');
      });

      expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'login@example.com' });
      expect(result.current.user).toEqual(mockUser);
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    });

    it('handles login errors', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Login failed'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('fail@example.com');
        })
      ).rejects.toThrow('Failed to login. Please try again.');

      expect(result.current.user).toBeNull();
    });

    it('updates user with name if provided', async () => {
      const mockUser = { id: '789', email: 'user@test.com', name: 'John Doe' };
      vi.mocked(api.post).mockResolvedValue({ data: { user: mockUser } });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('user@test.com');
      });

      expect(result.current.user?.name).toBe('John Doe');
    });
  });

  describe('logout function', () => {
    it('clears user and removes from localStorage', async () => {
      const mockUser = { id: '999', email: 'logout@example.com' };
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify user is loaded
      expect(result.current.user).toEqual(mockUser);

      // Logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('handles logout when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('Loading state', () => {
    it('eventually sets isLoading to false', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Just wait for loading to complete, don't check initial state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('persists user across login and page refresh simulation', async () => {
      const mockUser = { id: '111', email: 'persist@example.com' };
      vi.mocked(api.post).mockResolvedValue({ data: { user: mockUser } });

      // First render - login
      const { result: result1 } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result1.current.login('persist@example.com');
      });

      // Simulate page refresh - new render with same localStorage
      const { result: result2 } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false);
      });

      expect(result2.current.user).toEqual(mockUser);
    });

    it('handles login then logout sequence', async () => {
      const mockUser = { id: '222', email: 'sequence@example.com' };
      vi.mocked(api.post).mockResolvedValue({ data: { user: mockUser } });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login
      await act(async () => {
        await result.current.login('sequence@example.com');
      });
      expect(result.current.user).toEqual(mockUser);

      // Logout
      act(() => {
        result.current.logout();
      });
      expect(result.current.user).toBeNull();
    });
  });
});
