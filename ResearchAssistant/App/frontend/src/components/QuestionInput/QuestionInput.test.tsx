import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionInput } from './QuestionInput';
import { renderWithContext, mockDispatch,defaultMockState } from "../../test/test.utils";
import React from 'react';
const mockOnSend = jest.fn();
const documentSectionData = [
  { title: 'Introduction', content: 'This is the introduction section.', metaPrompt: 'Meta for Introduction' },
  { title: 'Methods', content: 'Methods content here.', metaPrompt: 'Meta for Methods' }
];

const renderComponent = (props = {}) => {
  return renderWithContext(
    <QuestionInput
      onSend={mockOnSend}
      disabled={false}
      {...props}
    />
  );
};

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

 

  test('calls onSend on send button click when not disabled', () => {
    render(<QuestionInput onSend={mockOnSend} disabled={false}  placeholder="Ask a question"/>)
    const input = screen.getByPlaceholderText('Ask a question')
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.click(screen.getByRole('button'))
    expect(mockOnSend).toHaveBeenCalledWith('Test question')
  })

 
  it("should call sendQuestion on Enter key press", () => {
    const { getByRole } = renderComponent();

    const input = getByRole("textbox");
    
    fireEvent.change(input, { target: { value: "Test question" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(mockOnSend).toHaveBeenCalledWith("Test question");
});

it("should not call sendQuestion on other key press via onKeyDown", () => {
    const { getByRole } = renderComponent();

    const input = getByRole("textbox");

    fireEvent.change(input, { target: { value: "Test question" } });
    fireEvent.keyDown(input, { key: "a", code: "KeyA" });

    expect(mockOnSend).not.toHaveBeenCalled();
});


it("should not call sendQuestion if input is empty", () => {
    const { getByRole } = renderComponent();

    const input = getByRole("textbox");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(mockOnSend).not.toHaveBeenCalled();
});

it("should not call sendQuestion if disabled", () => {
    const { getByRole } = renderComponent({ disabled: true });

    const input = getByRole("textbox");
    fireEvent.change(input, { target: { value: "Test question" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(mockOnSend).not.toHaveBeenCalled();
});
it("should set the initial question and dispatch when showInitialChatMessage is true", () => {
   
    const mockState = {
        ...defaultMockState,
        showInitialChatMessage: true,
        researchTopic: "Test Research Topic"
    };

    const { getByRole } = renderWithContext(<QuestionInput onSend={mockOnSend} disabled={false} />, mockState);

    
    const input = getByRole("textbox");
    expect(input).toHaveValue("test research topic");  

   
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_SHOW_INITIAL_CHAT_MESSAGE_FLAG', payload: false });
});




})