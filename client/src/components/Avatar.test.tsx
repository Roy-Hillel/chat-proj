import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar Component', () => {
  it('renders idle state with Bot icon', () => {
    const { container } = render(<Avatar state="idle" />);
    expect(container.querySelector('.text-gray-700')).toBeInTheDocument();
    expect(container.querySelector('.bg-gray-100')).toBeInTheDocument();
  });

  it('renders thinking state with Brain icon and purple color', () => {
    const { container } = render(<Avatar state="thinking" />);
    expect(container.querySelector('.text-purple-600')).toBeInTheDocument();
    expect(container.querySelector('.bg-purple-100')).toBeInTheDocument();
    expect(container.querySelector('.ring-purple-300')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders tool:search state with Search icon and blue color', () => {
    const { container } = render(<Avatar state="tool:search" />);
    expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
    expect(container.querySelector('.bg-blue-100')).toBeInTheDocument();
    expect(container.querySelector('.ring-blue-300')).toBeInTheDocument();
    expect(container.querySelector('.animate-bounce')).toBeInTheDocument();
  });

  it('renders tool:calculator state with Calculator icon and green color', () => {
    const { container } = render(<Avatar state="tool:calculator" />);
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
    expect(container.querySelector('.bg-green-100')).toBeInTheDocument();
    expect(container.querySelector('.ring-green-300')).toBeInTheDocument();
    expect(container.querySelector('.animate-bounce')).toBeInTheDocument();
  });

  it('renders error state with AlertCircle icon and red color', () => {
    const { container } = render(<Avatar state="error" />);
    expect(container.querySelector('.text-red-600')).toBeInTheDocument();
    expect(container.querySelector('.bg-red-100')).toBeInTheDocument();
    expect(container.querySelector('.ring-red-300')).toBeInTheDocument();
  });

  it('applies small size classes correctly', () => {
    const { container } = render(<Avatar state="idle" size="sm" />);
    expect(container.querySelector('.w-8')).toBeInTheDocument();
    expect(container.querySelector('.h-8')).toBeInTheDocument();
  });

  it('applies medium size classes correctly (default)', () => {
    const { container } = render(<Avatar state="idle" size="md" />);
    expect(container.querySelector('.w-12')).toBeInTheDocument();
    expect(container.querySelector('.h-12')).toBeInTheDocument();
  });

  it('applies large size classes correctly', () => {
    const { container } = render(<Avatar state="idle" size="lg" />);
    expect(container.querySelector('.w-16')).toBeInTheDocument();
    expect(container.querySelector('.h-16')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Avatar state="idle" className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('has rounded-full styling for circular avatar', () => {
    const { container } = render(<Avatar state="idle" />);
    expect(container.querySelector('.rounded-full')).toBeInTheDocument();
  });
});
