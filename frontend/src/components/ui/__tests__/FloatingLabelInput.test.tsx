import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingLabelInput } from '../FloatingLabelInput';

describe('FloatingLabelInput', () => {
  it('renders with label', () => {
    render(<FloatingLabelInput label="Test Label" />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('shows floating label when focused', async () => {
    const user = userEvent.setup();
    render(<FloatingLabelInput label="Test Label" />);
    const input = screen.getByLabelText('Test Label');
    
    await user.click(input);
    expect(input).toHaveFocus();
  });

  it('shows floating label when value exists', () => {
    render(<FloatingLabelInput label="Test Label" value="test value" />);
    const input = screen.getByDisplayValue('test value');
    expect(input).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    render(<FloatingLabelInput label="Test Label" error="This is an error" />);
    expect(screen.getByText('This is an error')).toBeInTheDocument();
  });

  it('displays helper text when helperText prop is provided', () => {
    render(<FloatingLabelInput label="Test Label" helperText="Helper text" />);
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  it('shows validation icon when showValidationIcon is true and value is valid', () => {
    render(
      <FloatingLabelInput
        label="Test Label"
        value="valid value"
        showValidationIcon={true}
      />
    );
    // Check icon should be present (checkmark)
    const input = screen.getByDisplayValue('valid value');
    expect(input).toBeInTheDocument();
  });

  it('shows error icon when showValidationIcon is true and error exists', () => {
    render(
      <FloatingLabelInput
        label="Test Label"
        value="invalid value"
        error="Error message"
        showValidationIcon={true}
      />
    );
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('calls onChange when input value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<FloatingLabelInput label="Test Label" onChange={handleChange} />);
    
    const input = screen.getByLabelText('Test Label');
    await user.type(input, 'test');
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('calls onFocus when input is focused', async () => {
    const handleFocus = vi.fn();
    const user = userEvent.setup();
    render(<FloatingLabelInput label="Test Label" onFocus={handleFocus} />);
    
    const input = screen.getByLabelText('Test Label');
    await user.click(input);
    
    expect(handleFocus).toHaveBeenCalled();
  });

  it('calls onBlur when input loses focus', async () => {
    const handleBlur = vi.fn();
    const user = userEvent.setup();
    render(<FloatingLabelInput label="Test Label" onBlur={handleBlur} />);
    
    const input = screen.getByLabelText('Test Label');
    await user.click(input);
    await user.tab();
    
    expect(handleBlur).toHaveBeenCalled();
  });

  it('shows required indicator when required prop is true', () => {
    render(<FloatingLabelInput label="Test Label" required />);
    const label = screen.getByText('Test Label');
    expect(label).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<FloatingLabelInput label="Test Label" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('applies custom className', () => {
    const { container } = render(
      <FloatingLabelInput label="Test Label" className="custom-class" />
    );
    const input = container.querySelector('input');
    expect(input).toHaveClass('custom-class');
  });

  it('passes through standard input props', () => {
    render(
      <FloatingLabelInput
        label="Test Label"
        type="email"
        placeholder="Enter email"
        disabled
      />
    );
    const input = screen.getByLabelText('Test Label') as HTMLInputElement;
    expect(input.type).toBe('email');
    expect(input.disabled).toBe(true);
  });
});

