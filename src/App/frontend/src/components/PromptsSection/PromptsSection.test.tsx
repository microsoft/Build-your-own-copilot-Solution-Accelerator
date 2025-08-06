import { render, screen, fireEvent } from '@testing-library/react';
import { PromptsSection, PromptType } from './PromptsSection';
import { PromptButton } from '../PromptButton/PromptButton';

jest.mock('../PromptButton/PromptButton', () => ({
  PromptButton: jest.fn(({ name, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>
      {name}
    </button>
  )),
}));

describe('PromptsSection', () => {
  const mockOnClickPrompt = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders prompts correctly', () => {
    render(<PromptsSection onClickPrompt={mockOnClickPrompt} isLoading={false} />);

    // Check if the prompt buttons are rendered
    expect(screen.getByText('Top discussion trends')).toBeInTheDocument();
    expect(screen.getByText('Investment summary')).toBeInTheDocument();
    expect(screen.getByText('Previous meeting summary')).toBeInTheDocument();
  });

  test('buttons are disabled when isLoading is true', () => {
    render(<PromptsSection onClickPrompt={mockOnClickPrompt} isLoading={true} />);

    // Check if buttons are disabled
    expect(screen.getByText('Top discussion trends')).toBeDisabled();
    expect(screen.getByText('Investment summary')).toBeDisabled();
    expect(screen.getByText('Previous meeting summary')).toBeDisabled();
  });

  test('buttons are enabled when isLoading is false', () => {
    render(<PromptsSection onClickPrompt={mockOnClickPrompt} isLoading={false} />);

    // Check if buttons are enabled
    expect(screen.getByText('Top discussion trends')).toBeEnabled();
    expect(screen.getByText('Investment summary')).toBeEnabled();
    expect(screen.getByText('Previous meeting summary')).toBeEnabled();
  });

  test('clicking a button calls onClickPrompt with correct prompt object', () => {
    render(<PromptsSection onClickPrompt={mockOnClickPrompt} isLoading={false} />);

    // Simulate button clicks
    fireEvent.click(screen.getByText('Top discussion trends'));
    expect(mockOnClickPrompt).toHaveBeenCalledWith({
      name: 'Top discussion trends',
      question: 'Top discussion trends',
      key: 'p1',
    });

    fireEvent.click(screen.getByText('Investment summary'));
    expect(mockOnClickPrompt).toHaveBeenCalledWith({
      name: 'Investment summary',
      question: 'Investment summary',
      key: 'p2',
    });

    fireEvent.click(screen.getByText('Previous meeting summary'));
    expect(mockOnClickPrompt).toHaveBeenCalledWith({
      name: 'Previous meeting summary',
      question: 'Previous meeting summary',
      key: 'p3',
    });
  });
});
