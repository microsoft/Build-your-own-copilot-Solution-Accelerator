import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptButton } from './PromptButton';

// Mock Fluent UI's DefaultButton
jest.mock('@fluentui/react', () => ({
  DefaultButton: ({ className, disabled, text, onClick }: any) => (
    <button className={className} disabled={disabled} onClick={onClick}>
      {text}
    </button>
  ),
}));

describe('PromptButton component', () => {
  const mockOnClick = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders button with provided name', () => {
    render(<PromptButton onClick={mockOnClick} name="Click Me" disabled={false} />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Click Me');
  });

  test('renders button with default name if no name is provided', () => {
    render(<PromptButton onClick={mockOnClick} name="" disabled={false} />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Default');
  });

  test('does not trigger onClick when button is disabled', () => {
    render(<PromptButton onClick={mockOnClick} name="Click Me" disabled={true} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  test('triggers onClick when button is clicked and not disabled', () => {
    render(<PromptButton onClick={mockOnClick} name="Click Me" disabled={false} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
