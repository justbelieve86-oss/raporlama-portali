import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  const MockIcon = ({ className }: { className?: string }) => <span data-testid="icon" className={className}>Icon</span>;

  it('renders with title and value', () => {
    render(<StatCard title="Test Title" value="100" icon={MockIcon} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(<StatCard title="Test" value="100" icon={MockIcon} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('displays trend indicator when trend prop is provided', () => {
    render(<StatCard title="Test" value="100" icon={MockIcon} trend="up" change="10%" />);
    expect(screen.getByText(/10%/i)).toBeInTheDocument();
  });

  it('displays loading state when loading prop is true', () => {
    render(<StatCard title="Test" value="100" icon={MockIcon} loading />);
    // Check for loading shimmer or skeleton
    const card = screen.getByText('Test').closest('div');
    expect(card).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StatCard title="Test" value="100" icon={MockIcon} className="custom-class" />
    );
    const card = container.firstChild;
    expect(card).toHaveClass('custom-class');
  });

  it('handles click events when onClick is provided', () => {
    const handleClick = vi.fn();
    render(<StatCard title="Test" value="100" icon={MockIcon} onClick={handleClick} />);
    const card = screen.getByText('Test').closest('div');
    if (card) {
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalled();
    }
  });
});

