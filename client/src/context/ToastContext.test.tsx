import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

describe('ToastContext', () => {
  describe('ToastProvider', () => {
    it('provides toast context to children', () => {
      render(
        <ToastProvider>
          <div>Test Child</div>
        </ToastProvider>
      );
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('renders without crashing', () => {
      const { container } = render(
        <ToastProvider>
          <div>Content</div>
        </ToastProvider>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('useToast hook', () => {
    it('throws error when used outside ToastProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within ToastProvider');

      consoleSpy.mockRestore();
    });

    it('provides showError, showSuccess, showInfo, and showToast functions', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      expect(result.current.showError).toBeDefined();
      expect(result.current.showSuccess).toBeDefined();
      expect(result.current.showInfo).toBeDefined();
      expect(result.current.showToast).toBeDefined();
    });

    it('showError is a function', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      expect(typeof result.current.showError).toBe('function');
    });

    it('showSuccess is a function', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      expect(typeof result.current.showSuccess).toBe('function');
    });

    it('showInfo is a function', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      expect(typeof result.current.showInfo).toBe('function');
    });
  });

  describe('Toast functionality', () => {
    it('can call showError without crashing', async () => {
      function TestComponent() {
        const { showError } = useToast();
        return (
          <button onClick={() => showError('Test error')}>
            Show Error
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const button = screen.getByRole('button');
      button.click();

      // Toast should appear
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
    });

    it('can call showSuccess without crashing', async () => {
      function TestComponent() {
        const { showSuccess } = useToast();
        return (
          <button onClick={() => showSuccess('Test success')}>
            Show Success
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const button = screen.getByRole('button');
      button.click();

      await waitFor(() => {
        expect(screen.getByText('Test success')).toBeInTheDocument();
      });
    });

    it('can call showInfo without crashing', async () => {
      function TestComponent() {
        const { showInfo } = useToast();
        return (
          <button onClick={() => showInfo('Test info')}>
            Show Info
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const button = screen.getByRole('button');
      button.click();

      await waitFor(() => {
        expect(screen.getByText('Test info')).toBeInTheDocument();
      });
    });

    it('renders toast with close button', async () => {
      function TestComponent() {
        const { showError } = useToast();
        return (
          <button onClick={() => showError('Test message')}>
            Show Toast
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      screen.getByRole('button', { name: 'Show Toast' }).click();

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      // Check that there are multiple buttons (the Show Toast button and the X button)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
    });

    it('displays multiple toasts without crashing', async () => {
      function TestComponent() {
        const { showError, showSuccess } = useToast();
        return (
          <>
            <button onClick={() => showError('Error toast')}>Error</button>
            <button onClick={() => showSuccess('Success toast')}>Success</button>
          </>
        );
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      screen.getByText('Error').click();
      screen.getByText('Success').click();

      await waitFor(() => {
        expect(screen.getByText('Error toast')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Success toast')).toBeInTheDocument();
      });
    });
  });

  describe('Toast container rendering', () => {
    it('renders toast container even with no toasts', () => {
      const { container } = render(
        <ToastProvider>
          <div>Content</div>
        </ToastProvider>
      );

      // The toast container should be in the DOM
      const toastContainer = container.querySelector('.fixed.top-4.right-4');
      expect(toastContainer).toBeInTheDocument();
    });
  });
});
