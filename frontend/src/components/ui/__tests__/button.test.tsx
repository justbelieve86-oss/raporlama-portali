import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick} disabled>Click me</Button>);
    
    await user.click(screen.getByText('Click me'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders primary variant by default', () => {
    const { container } = render(<Button>Click me</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('renders secondary variant', () => {
    const { container } = render(<Button variant="secondary">Click me</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-gray-200');
  });

  it('renders ghost variant', () => {
    const { container } = render(<Button variant="ghost">Click me</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('hover:bg-gray-100');
  });

  it('applies custom className', () => {
    const { container } = render(<Button className="custom-class">Click me</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Button ref={ref}>Click me</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('passes through standard button props', () => {
    render(<Button type="submit" aria-label="Submit form">Submit</Button>);
    const button = screen.getByLabelText('Submit form') as HTMLButtonElement;
    expect(button.type).toBe('submit');
  });

  it('has correct disabled styles', () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('disabled:opacity-50');
    expect(button).toHaveClass('disabled:pointer-events-none');
  });

  it('has hover and active transform classes', () => {
    const { container } = render(<Button>Click me</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('hover:scale-105');
    expect(button).toHaveClass('active:scale-95');
  });
});

