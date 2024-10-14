import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessageContainer } from './ChatMessageContainer';
import { ChatMessage, Citation } from '../../../api/models';
import { Answer } from '../../../components/Answer';

jest.mock('../../../components/Answer', () => ({
    Answer: jest.fn((props: any) => <div>
        <p>{props.answer.answer}</p>
        <span>Mock Answer Component</span>
        {props.answer.answer  == 'Generating answer...' ?
        <button onClick={() => props.onCitationClicked()}>Mock Citation Loading</button>        :
        <button onClick={() => props.onCitationClicked({ title: 'Test Citation' })}>Mock Citation</button>
        }
        
    </div>)
}));

const mockOnShowCitation = jest.fn();

describe('ChatMessageContainer', () => {

    beforeEach(() => {
        global.fetch = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    

    const userMessage: ChatMessage = {
        role: 'user',
        content: 'User message',
        id: '1',
        feedback: undefined,
        date: new Date().toDateString()
    };

    const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: 'Assistant message',
        id: '2',
        feedback: undefined,
        date: new Date().toDateString()
    };

    const errorMessage: ChatMessage = {
        role: 'error',
        content: 'Error message',
        id: '3',
        feedback: undefined,
        date: new Date().toDateString()
    };

    it('renders user and assistant messages correctly', () => {
        render(
            <ChatMessageContainer
                messages={[userMessage, assistantMessage]}
                isLoading={false}
                showLoadingMessage={false}
                onShowCitation={mockOnShowCitation}
            />
        );

        // Check if user message is displayed
        expect(screen.getByText('User message')).toBeInTheDocument();

        // Check if assistant message is displayed via Answer component
        expect(screen.getByText('Mock Answer Component')).toBeInTheDocument();
        expect(Answer).toHaveBeenCalledWith(
            expect.objectContaining({
                answer: {
                    answer: 'Assistant message',
                    citations: [], // No citations since this is the first message
                    message_id: '2',
                    feedback: undefined
                }
            }),
            {}
        );
    });

    it('renders an error message correctly', () => {
        render(
            <ChatMessageContainer
                messages={[errorMessage]}
                isLoading={false}
                showLoadingMessage={false}
                onShowCitation={mockOnShowCitation}
            />
        );

        // Check if error message is displayed with the error icon
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('displays the loading message when showLoadingMessage is true', () => {
        render(
            <ChatMessageContainer
                messages={[]}
                isLoading={false}
                showLoadingMessage={true}
                onShowCitation={mockOnShowCitation}
            />
        );
        // Check if the loading message is displayed via Answer component
        expect(screen.getByText('Generating answer...')).toBeInTheDocument();
    });

    it('applies correct margin when loading is true', () => {
        const { container } = render(
            <ChatMessageContainer
                messages={[userMessage, assistantMessage]}
                isLoading={true}
                showLoadingMessage={false}
                onShowCitation={mockOnShowCitation}
            />
        );

        // Verify the margin is applied correctly when loading is true
        const chatMessagesContainer = container.querySelector('#chatMessagesContainer');
        expect(chatMessagesContainer).toHaveStyle('margin-bottom: 40px');
    });

    it('applies correct margin when loading is false', () => {
        const { container } = render(
            <ChatMessageContainer
                messages={[userMessage, assistantMessage]}
                isLoading={false}
                showLoadingMessage={false}
                onShowCitation={mockOnShowCitation}
            />
        );

        // Verify the margin is applied correctly when loading is false
        const chatMessagesContainer = container.querySelector('#chatMessagesContainer');
        expect(chatMessagesContainer).toHaveStyle('margin-bottom: 0px');
    });


    it('calls onShowCitation when a citation is clicked', () => {
        render(
            <ChatMessageContainer
                messages={[assistantMessage]}
                isLoading={false}
                showLoadingMessage={false}
                onShowCitation={mockOnShowCitation}
            />
        );

        // Simulate a citation click
        const citationButton = screen.getByText('Mock Citation');
        fireEvent.click(citationButton);

        // Check if onShowCitation is called with the correct argument
        expect(mockOnShowCitation).toHaveBeenCalledWith({ title: 'Test Citation' });
    });

    it('does not call onShowCitation when citation click is a no-op', () => {
        render(
            <ChatMessageContainer
                messages={[]}
                isLoading={false}
                showLoadingMessage={true}
                onShowCitation={mockOnShowCitation} // No-op function
            />
        );
        // Simulate a citation click
        const citationButton = screen.getByRole('button', {name : 'Mock Citation Loading'});
        fireEvent.click(citationButton);

        // Check if onShowCitation is NOT called
        expect(mockOnShowCitation).not.toHaveBeenCalled();
    });
});
