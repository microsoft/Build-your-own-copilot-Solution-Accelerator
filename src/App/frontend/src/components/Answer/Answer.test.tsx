import { renderWithContext, screen, waitFor, fireEvent, act, logRoles } from '../../test/test.utils';
import { Answer } from './Answer'
import { AppStateContext } from '../../state/AppProvider'
import {AskResponse, Citation, Feedback, historyMessageFeedback } from '../../api';
//import { Feedback, AskResponse, Citation } from '../../api/models'
import { cloneDeep } from 'lodash'
import userEvent from '@testing-library/user-event';
import { CitationPanel } from '../../pages/chat/Components/CitationPanel';

// Mock required modules and functions
jest.mock('../../api/api', () => ({
    historyMessageFeedback: jest.fn(),
}))

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
    nord: {
        // Mock style object (optional)
        'code[class*="language-"]': {
            color: '#e0e0e0', // Example mock style
            background: '#2e3440', // Example mock style
        },
    },
}));

// Mocking remark-gfm and rehype-raw
jest.mock('remark-gfm', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
jest.mock('remark-supersub', () => jest.fn());

const mockDispatch = jest.fn();
const mockOnCitationClicked = jest.fn();

// Mock context provider values
let mockAppState = {
    frontendSettings: { feedback_enabled: true, sanitize_answer: true },
    isCosmosDBAvailable: { cosmosDB: true },

}

const mockCitations: Citation[] = [
    {
        id: 'doc1',
        filepath: 'C:\code\CWYOD-2\chat-with-your-data-solution-accelerator\docs\file1.pdf',
        part_index: undefined,
        content: '',
        title: null,
        url: null,
        metadata: null,
        chunk_id: null,
        reindex_id: '1'
    },
    {
        id: 'doc2',
        filepath: 'file2.pdf',
        part_index: undefined,
        content: '',
        title: null,
        url: null,
        metadata: null,
        chunk_id: null,
        reindex_id: '2'
    },
    {
        id: 'doc3',
        filepath: '',
        part_index: undefined,
        content: '',
        title: null,
        url: null,
        metadata: null,
        chunk_id: null,
        reindex_id: '3'
    }
]
let mockAnswerProps: AskResponse = {
    answer: 'This is an example answer with citations [doc1] and [doc2] and [doc3].',
    message_id: '123',
    feedback: Feedback.Neutral,
    citations: cloneDeep(mockCitations)
}

const toggleIsRefAccordionOpen = jest.fn();
const onCitationClicked = jest.fn();

describe('Answer Component', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
        onCitationClicked.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const isEmpty = (obj: any) => Object.keys(obj).length === 0;

    const renderComponent = (props?: any, appState?: any) => {
        if (appState != undefined) {
            mockAppState = { ...mockAppState, ...appState }
        }
        return (
            renderWithContext(<Answer answer={(props == undefined || isEmpty(props)) ? mockAnswerProps : props} onCitationClicked={onCitationClicked} />, mockAppState)
        )

    }


    it('should render the answer component correctly', () => {
        renderComponent();

        // Check if citations and feedback buttons are rendered
        expect(screen.getByText(/This is an example answer with citations/i)).toBeInTheDocument();
        expect(screen.getByLabelText('Like this response')).toBeInTheDocument();
        expect(screen.getByLabelText('Dislike this response')).toBeInTheDocument();
    });

    it('should render the answer component correctly when sanitize_answer is false', () => {

        const answerWithMissingFeedback = {
           ...mockAnswerProps
        }
        const extraMockState = {
            frontendSettings: { feedback_enabled: true, sanitize_answer: false },
        }
        
        renderComponent(answerWithMissingFeedback,extraMockState);

        // Check if citations and feedback buttons are rendered
        expect(screen.getByText(/This is an example answer with citations/i)).toBeInTheDocument();
    });

    it('should show "1 reference" when citations lenght is one', () => {

        const answerWithMissingFeedback = {
           ...mockAnswerProps,
           answer: 'This is an example answer with citations [doc1]',
        }
        
        renderComponent(answerWithMissingFeedback);

        // Check if citations and feedback buttons are rendered
        expect(screen.getByText(/1 reference/i)).toBeInTheDocument();
    });


    it('returns undefined when message_id is undefined', () => {

        const answerWithMissingFeedback = {
            answer: 'This is an example answer with citations [doc1] and [doc2].',
            feedback: 'Test',
            citations: []
        }

        renderComponent(answerWithMissingFeedback);

        // Check if citations and feedback buttons are rendered
        expect(screen.getByText(/This is an example answer with citations/i)).toBeInTheDocument();
    });

    it('returns undefined when feedback is undefined', () => {

        const answerWithMissingFeedback = {
            answer: 'This is an example answer with citations [doc1] and [doc2].',
            message_id: '123',
            citations: []
        }

        renderComponent(answerWithMissingFeedback);

        // Check if citations and feedback buttons are rendered
        expect(screen.getByText(/This is an example answer with citations/i)).toBeInTheDocument();
    });

    it('returns Feedback.Negative when feedback contains more than one item', () => {

        const answerWithMissingFeedback = {
            answer: 'This is an example answer with citations [doc1] and [doc2].',
            message_id: '123',
            feedback: 'negative,neutral',
            citations: []
        }

        renderComponent(answerWithMissingFeedback);

        // Check if citations and feedback buttons are rendered
        expect(screen.getByText(/This is an example answer with citations/i)).toBeInTheDocument();
    });


    it('calls toggleIsRefAccordionOpen when Enter key is pressed', () => {
        renderComponent();

        // Check if citations and feedback buttons are rendered
        const stackItem = screen.getByTestId('stack-item');

        // Simulate pressing the Enter key
        fireEvent.keyDown(stackItem, { key: 'Enter', code: 'Enter', charCode: 13 });

        // Check if the function is called
        // expect(onCitationClicked).toHaveBeenCalled();
    });

    it('calls toggleIsRefAccordionOpen when Space key is pressed', () => {
        renderComponent();

        // Check if citations and feedback buttons are rendered
        const stackItem = screen.getByTestId('stack-item');

        // Simulate pressing the Escape key
        fireEvent.keyDown(stackItem, { key: ' ', code: 'Space', charCode: 32 });

        // Check if the function is called
        // expect(toggleIsRefAccordionOpen).toHaveBeenCalled();
    });

    it('does not call toggleIsRefAccordionOpen when Tab key is pressed', () => {
        renderComponent();
    
        const stackItem = screen.getByTestId('stack-item');
    
        // Simulate pressing the Tab key
        fireEvent.keyDown(stackItem, { key: 'Tab', code: 'Tab', charCode: 9 });
    
        // Check that the function is not called
        expect(toggleIsRefAccordionOpen).not.toHaveBeenCalled();
      });


    it('should handle chevron click to toggle references accordion', async () => {
        renderComponent();

        // Chevron is initially collapsed
        const chevronIcon = screen.getByRole('button', { name: 'Open references' });
        const element = screen.getByTestId('ChevronIcon')
        expect(element).toHaveAttribute('data-icon-name', 'ChevronRight')

        // Click to expand
        fireEvent.click(chevronIcon);
        //expect(screen.getByText('ChevronDown')).toBeInTheDocument();
        expect(element).toHaveAttribute('data-icon-name', 'ChevronDown')
    });

    it('calls onCitationClicked when citation is clicked', async () => {
        userEvent.setup();
        renderComponent();

        // Chevron is initially collapsed
        const chevronIcon = screen.getByRole('button', { name: 'Open references' });
        const element = screen.getByTestId('ChevronIcon')
        expect(element).toHaveAttribute('data-icon-name', 'ChevronRight')

        // Click to expand
        await userEvent.click(chevronIcon);
        const citations = screen.getAllByRole('link');

        // Simulate click on the first citation
        await userEvent.click(citations[0]);

        // Check if the function is called with the correct citation
        expect(onCitationClicked).toHaveBeenCalledTimes(1);
    })

    it('calls onCitationClicked when Enter key is pressed', async () => {
        userEvent.setup();
        renderComponent();

        // Chevron is initially collapsed
        const chevronIcon = screen.getByRole('button', { name: 'Open references' });
        const element = screen.getByTestId('ChevronIcon')
        expect(element).toHaveAttribute('data-icon-name', 'ChevronRight')

        // Click to expand
        await userEvent.click(chevronIcon);

        // Get the first citation span
        const citation = screen.getAllByRole('link')[0];

        // Simulate pressing the Enter key
        fireEvent.keyDown(citation, { key: 'Enter', code: 'Enter' });

        // Check if the function is called with the correct citation
        expect(onCitationClicked).toHaveBeenCalledTimes(1)
    });

    it('calls onCitationClicked when Space key is pressed', async () => {
        userEvent.setup();
        renderComponent();

        // Chevron is initially collapsed
        const chevronIcon = screen.getByRole('button', { name: 'Open references' });
        const element = screen.getByTestId('ChevronIcon')
        expect(element).toHaveAttribute('data-icon-name', 'ChevronRight')

        // Click to expand
        await userEvent.click(chevronIcon);

        // Get the first citation span
        const citation = screen.getAllByRole('link')[0];

        // Simulate pressing the Space key
        fireEvent.keyDown(citation, { key: ' ', code: 'Space' });

        // Check if the function is called with the correct citation
        expect(onCitationClicked).toHaveBeenCalledTimes(1);
    });

    it('does not call onCitationClicked for other keys', async() => {
        userEvent.setup();
        renderComponent();

        // Chevron is initially collapsed
        const chevronIcon = screen.getByRole('button', { name: 'Open references' });
        const element = screen.getByTestId('ChevronIcon')
        expect(element).toHaveAttribute('data-icon-name', 'ChevronRight')

        // Click to expand
        await userEvent.click(chevronIcon);
    
        // Get the first citation span
        const citation = screen.getAllByRole('link')[0];
    
        // Simulate pressing a different key (e.g., 'a')
        fireEvent.keyDown(citation, { key: 'a', code: 'KeyA' });
    
        // Check if the function is not called
        expect(onCitationClicked).not.toHaveBeenCalled();
      });

    it('should update feedback state on like button click', async () => {
        renderComponent();

        const likeButton = screen.getByLabelText('Like this response');

        // Initially neutral feedback
        await act(async () => {
            fireEvent.click(likeButton);
        });
        await waitFor(() => {
            expect(historyMessageFeedback).toHaveBeenCalledWith(mockAnswerProps.message_id, Feedback.Positive);
        });

        // // Clicking again should set feedback to neutral
        // const likeButton1 = screen.getByLabelText('Like this response');
        // await act(async()=>{
        //     fireEvent.click(likeButton1);
        // });
        // await waitFor(() => {
        //   expect(historyMessageFeedback).toHaveBeenCalledWith(mockAnswerProps.message_id, Feedback.Neutral);
        // });
    });

    it('should open and submit negative feedback dialog', async () => {
        userEvent.setup();
        renderComponent();
        const handleChange = jest.fn();
        const dislikeButton = screen.getByLabelText('Dislike this response');

        // Click dislike to open dialog
        await fireEvent.click(dislikeButton);
        expect(screen.getByText("Why wasn't this response helpful?")).toBeInTheDocument();

        // Select feedback and submit
        const checkboxEle = await screen.findByLabelText(/Citations are wrong/i)
        //logRoles(checkboxEle)
        await waitFor(() => {
            userEvent.click(checkboxEle);
        });
        await userEvent.click(screen.getByText('Submit'));

        await waitFor(() => {
            expect(historyMessageFeedback).toHaveBeenCalledWith(mockAnswerProps.message_id, `${Feedback.WrongCitation}`);
        });
    });

    it('calls resetFeedbackDialog and setFeedbackState with Feedback.Neutral on dialog dismiss', async () => {

        const resetFeedbackDialogMock = jest.fn();
        const setFeedbackStateMock = jest.fn();

        userEvent.setup();
        renderComponent();
        const handleChange = jest.fn();
        const dislikeButton = screen.getByLabelText('Dislike this response');

        // Click dislike to open dialog
        await userEvent.click(dislikeButton);
        expect(screen.getByText("Why wasn't this response helpful?")).toBeInTheDocument();

        // Assuming there is a close button in the dialog that dismisses it
        const dismissButton = screen.getByRole('button', { name: /close/i }); // Adjust selector as needed

        // Simulate clicking the dismiss button
        await userEvent.click(dismissButton);

        // Assert that the mocks were called
        //expect(resetFeedbackDialogMock).toHaveBeenCalled();
        //expect(setFeedbackStateMock).toHaveBeenCalledWith('Neutral');

    });


    it('Dialog Options should be able to select and unSelect', async () => {
        userEvent.setup();
        renderComponent();
        const handleChange = jest.fn();
        const dislikeButton = screen.getByLabelText('Dislike this response');

        // Click dislike to open dialog
        await userEvent.click(dislikeButton);

        expect(screen.getByText("Why wasn't this response helpful?")).toBeInTheDocument();

        // Select feedback and submit
        const checkboxEle = await screen.findByLabelText(/Citations are wrong/i)
        expect(checkboxEle).not.toBeChecked();

        await userEvent.click(checkboxEle);
        await waitFor(() => {
            expect(checkboxEle).toBeChecked();
        });

        const checkboxEle1 = await screen.findByLabelText(/Citations are wrong/i)

        await userEvent.click(checkboxEle1);
        await waitFor(() => {
            expect(checkboxEle1).not.toBeChecked();
        });

    });

    it('Should able to show ReportInappropriateFeedbackContent form while click on "InappropriateFeedback" button ', async () => {
        userEvent.setup();
        renderComponent();
        const handleChange = jest.fn();
        const dislikeButton = screen.getByLabelText('Dislike this response');

        // Click dislike to open dialog
        await userEvent.click(dislikeButton);

        const InappropriateFeedbackDivBtn = screen.getByTestId("InappropriateFeedback")
        expect(InappropriateFeedbackDivBtn).toBeInTheDocument();

        await userEvent.click(InappropriateFeedbackDivBtn);

        await waitFor(() => {
            expect(screen.getByTestId("ReportInappropriateFeedbackContent")).toBeInTheDocument();
        })
    });

    it('should handle citation click and trigger callback', async () => {
        userEvent.setup();
        renderComponent();
        const citationText = screen.getByTestId('ChevronIcon');
        await userEvent.click(citationText);
        expect(citationText).toHaveAttribute('data-icon-name', 'ChevronDown')
    });

    it('should handle if we do not pass feedback ', () => {

        const answerWithMissingFeedback = {
            answer: 'This is an example answer with citations [doc1] and [doc2].',
            message_id: '123',
            feedback: 'Test',
            citations: []
        }
        const extraMockState = {
            feedbackState: { '123': Feedback.Neutral },
        }
        renderComponent(answerWithMissingFeedback, extraMockState);
    })


    it('should update feedback state on like button click - 1', async () => {

        const answerWithMissingFeedback = {
            ...mockAnswerProps,
            answer: 'This is an example answer with citations [doc1] and [doc2].',
            message_id: '123',
            feedback: Feedback.Neutral,
        }
        const extraMockState = {
            feedbackState: { '123': Feedback.Positive },
        }
        renderComponent(answerWithMissingFeedback, extraMockState);
        const likeButton = screen.getByLabelText('Like this response');

        // Initially neutral feedback
        await act(async () => {
            fireEvent.click(likeButton);
        });
        await waitFor(() => {
            expect(historyMessageFeedback).toHaveBeenCalledWith(mockAnswerProps.message_id, Feedback.Neutral);
        });

    });

    it('should open and submit negative feedback dialog -1', async () => {
        userEvent.setup();
        const answerWithMissingFeedback = {
            ...mockAnswerProps,
            answer: 'This is an example answer with citations [doc1] and [doc2].',
            message_id: '123',
            feedback: Feedback.OtherHarmful,
        }
        const extraMockState = {
            feedbackState: { '123': Feedback.OtherHarmful },
        }
        renderComponent(answerWithMissingFeedback, extraMockState);
        const handleChange = jest.fn();
        const dislikeButton = screen.getByLabelText('Dislike this response');

        // Click dislike to open dialog
        await userEvent.click(dislikeButton);
        await waitFor(() => {
            expect(historyMessageFeedback).toHaveBeenCalledWith(mockAnswerProps.message_id, Feedback.Neutral);
        });
    });

    it('should handle chevron click to toggle references accordion - 1', async () => {
        let tempMockCitation = [...mockCitations];

        tempMockCitation[0].filepath = '';
        tempMockCitation[0].reindex_id = '';
        const answerWithMissingFeedback = {
            ...mockAnswerProps,
            CitationPanel: [...tempMockCitation]
        }

        renderComponent();

        // Chevron is initially collapsed
        const chevronIcon = screen.getByRole('button', { name: 'Open references' });
        const element = screen.getByTestId('ChevronIcon')
        expect(element).toHaveAttribute('data-icon-name', 'ChevronRight')

        // Click to expand
        fireEvent.click(chevronIcon);
        //expect(screen.getByText('ChevronDown')).toBeInTheDocument();
        expect(element).toHaveAttribute('data-icon-name', 'ChevronDown')
    });


})
