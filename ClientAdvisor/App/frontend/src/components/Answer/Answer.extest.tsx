import { renderWithContext, screen, waitFor, fireEvent, act, logRoles } from '../../test/test.utils';
import { Answer } from './Answer'
import { AppStateContext } from '../../state/AppProvider'
import { historyMessageFeedback } from '../../api'
import { Feedback, AskResponse, Citation } from '../../api/models'
import { cloneDeep } from 'lodash'
import userEvent from '@testing-library/user-event';

//import DOMPurify from 'dompurify';

jest.mock('dompurify', () => ({
    sanitize: jest.fn((input) => input), // Returns the input as is
}));

// Mock required modules and functions
jest.mock('../../api', () => ({
    historyMessageFeedback: jest.fn()
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

jest.mock('react-markdown');
// jest.mock('react-markdown', () => {
//     return ({ children } : any) => <div>React Mock{children}</div>; // Mock implementation
// });

// jest.mock(
//     "react-markdown",
//     () =>
//       ({ children }: { children: React.ReactNode }) => {
//         return <div data-testid="mock-react-markdown">{children}</div>;
//       }
//   );

// Mocking remark-gfm and rehype-raw
jest.mock('remark-gfm', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
jest.mock('remark-supersub', () => jest.fn());

const mockDispatch = jest.fn();
const mockOnCitationClicked = jest.fn();

// Mock context provider values
const mockAppState = {
    frontendSettings: { feedback_enabled: true, sanitize_answer: true },
    isCosmosDBAvailable: { cosmosDB: true },
    feedbackState: {},
}


const mockAnswer = {
    message_id: '123',
    feedback: Feedback.Positive,
    markdownFormatText: 'This is a **test** answer with a [link](https://example.com)',
    answer: 'Test **markdown** content',
    error: '',
    citations: [{
        id: 'doc1',
        filepath: 'file1.pdf',
        part_index: 1,
        content: 'Document 1 content',
        title: "Test 1",
        url: "http://test1.in",
        metadata: "metadata 1",
        chunk_id: "Chunk id 1",
        reindex_id: "reindex 1"
    },
    ],
};

const sampleCitations: Citation[] = [
    {
        id: 'doc1',
        filepath: 'file1.pdf',
        part_index: undefined,
        content: '',
        title: null,
        url: null,
        metadata: null,
        chunk_id: null,
        reindex_id: '123'
    },
    {
        id: 'doc2',
        filepath: 'file1.pdf',
        part_index: undefined,
        content: '',
        title: null,
        url: null,
        metadata: null,
        chunk_id: null,
        reindex_id: '1234'
    },
    {
        id: 'doc3',
        filepath: 'file2.pdf',
        part_index: undefined,
        content: '',
        title: null,
        url: null,
        metadata: null,
        chunk_id: null,
        reindex_id: null
    }
]
const sampleAnswer: AskResponse = {
    answer: 'This is an example answer with citations [doc1] and [doc2].',
    message_id: '123',
    feedback: Feedback.Neutral,
    citations: cloneDeep(sampleCitations)
}

describe('Answer Component', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const renderComponent = (props = {}) =>
    (
        renderWithContext(<Answer answer={sampleAnswer} onCitationClicked={jest.fn()} {...props} />, mockAppState)
    )


    it('should render the answer component correctly', () => {
        renderComponent();

        // Check if citations and feedback buttons are rendered
        expect(screen.getByText('AI-generated content may be incorrect')).toBeInTheDocument();
        expect(screen.getByLabelText('Like this response')).toBeInTheDocument();
        expect(screen.getByLabelText('Dislike this response')).toBeInTheDocument();
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

    it('should update feedback state on like button click', async () => {
        renderComponent();

        const likeButton = screen.getByLabelText('Like this response');

        // Initially neutral feedback
        await act(async () => {
            fireEvent.click(likeButton);
        });
        await waitFor(() => {
            expect(historyMessageFeedback).toHaveBeenCalledWith(mockAnswer.message_id, Feedback.Positive);
        });

        // // Clicking again should set feedback to neutral
        // const likeButton1 = screen.getByLabelText('Like this response');
        // await act(async()=>{
        //     fireEvent.click(likeButton1);
        // });
        // await waitFor(() => {
        //   expect(historyMessageFeedback).toHaveBeenCalledWith(mockAnswer.message_id, Feedback.Neutral);
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

        // expect(handleChange).toHaveBeenCalledTimes(1);
        //expect(checkboxEle).toBeChecked();

        await userEvent.click(screen.getByText('Submit'));

        await waitFor(() => {
            expect(historyMessageFeedback).toHaveBeenCalledWith(mockAnswer.message_id, `${Feedback.WrongCitation}`);
        });
    });

    it('should handle citation click and trigger callback', async () => {
        userEvent.setup();
        renderComponent();
        const citationText = screen.getByTestId('ChevronIcon');
        await userEvent.click(citationText);
        expect(citationText).toHaveAttribute('data-icon-name', 'ChevronDown')
    });
})
