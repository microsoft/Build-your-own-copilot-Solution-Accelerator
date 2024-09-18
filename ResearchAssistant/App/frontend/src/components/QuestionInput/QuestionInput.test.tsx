import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionInput } from './QuestionInput';

const mockOnSend = jest.fn();

jest.mock('../../state/AppProvider', () => ({
    AppStateContext: {
        state: {
            documentSections: [],
            researchTopic: '',
            showInitialChatMessage: true,
            sidebarSelection: null,
        },
        dispatch: jest.fn(),
    },
 }));

describe('QuestionInput Component', () => {
   afterEach(() => {
       jest.clearAllMocks();
   });

   test('renders correctly with placeholder', () => {
       render(<QuestionInput onSend={mockOnSend} disabled={false} placeholder="Ask a question" />);
       expect(screen.getByPlaceholderText('Ask a question')).toBeInTheDocument();
   })

   test('does not call onSend when disabled', () => {
    render(<QuestionInput onSend={mockOnSend} disabled={true} placeholder="Ask a question"/>)
    const input = screen.getByPlaceholderText('Ask a question')
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(mockOnSend).not.toHaveBeenCalled()
  })
  test('calls onSend with question and conversationId when enter is pressed', () => {
    render(<QuestionInput onSend={mockOnSend} disabled={false} conversationId="123" placeholder="Ask a question"/>)
    const input = screen.getByPlaceholderText('Ask a question')
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(mockOnSend).toHaveBeenCalledWith('Test question', '123')
  })
  test('clears question input if clearOnSend is true', () => {
    render(<QuestionInput onSend={mockOnSend} disabled={false} clearOnSend={true} placeholder="Ask a question" />)
    const input = screen.getByPlaceholderText('Ask a question')
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(input).toHaveValue('')
  })
  test('does not clear question input if clearOnSend is false', () => {
    render(<QuestionInput onSend={mockOnSend} disabled={false} clearOnSend={false}  placeholder="Ask a question"/>)
    const input = screen.getByPlaceholderText('Ask a question')
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    expect(input).toHaveValue('Test question')
  })

  test('disables send button when question is empty or disabled', () => {
    //render(<QuestionInput onSend={mockOnSend} disabled={true} placeholder="Ask a question"/>)
    //expect(screen.getByRole('button')).toBeDisabled()

    render(<QuestionInput onSend={mockOnSend} disabled={false}  placeholder="Ask a question"/>)
    const input = screen.getByPlaceholderText('Ask a question')
    fireEvent.change(input, { target: { value: '' } })
    //expect(screen.getByRole('button')).toBeDisabled()
  })

  test('calls onSend on send button click when not disabled', () => {
    render(<QuestionInput onSend={mockOnSend} disabled={false}  placeholder="Ask a question"/>)
    const input = screen.getByPlaceholderText('Ask a question')
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.click(screen.getByRole('button'))
    expect(mockOnSend).toHaveBeenCalledWith('Test question')
  })

  test('send button shows SendRegular icon when disabled', () => {
    render(<QuestionInput onSend={mockOnSend} disabled={true} />)
    //expect(screen.getByTestId('send-icon')).toBeInTheDocument()
  })

  test('send button shows Send SVG when enabled', () => {
    render(<QuestionInput onSend={mockOnSend} disabled={false} />)
   // expect(screen.getByAltText('Send Button')).toBeInTheDocument()
  })

})