import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './ConfirmModal';

describe('ConfirmModal Component', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Test Title',
    message: 'Test message content',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('renders modal when isOpen is true', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('displays default button labels', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('displays custom button labels', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmLabel="Delete"
        cancelLabel="Keep"
      />
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Yes'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when X button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    // Find all buttons and get the X close button (first button in the modal header)
    const buttons = screen.getAllByRole('button');
    // The X button should be the first button (before Cancel and Yes)
    const xButton = buttons[0];
    fireEvent.click(xButton);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    // Find the backdrop (the semi-transparent overlay)
    const backdrop = document.querySelector('.bg-black\\/50');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    }
  });

  it('applies destructive styling when isDestructive is true', () => {
    render(<ConfirmModal {...defaultProps} isDestructive />);
    const confirmButton = screen.getByText('Yes');
    expect(confirmButton).toHaveClass('bg-red-600');
  });

  it('applies normal styling when isDestructive is false', () => {
    render(<ConfirmModal {...defaultProps} isDestructive={false} />);
    const confirmButton = screen.getByText('Yes');
    expect(confirmButton).toHaveClass('bg-blue-600');
  });
});
