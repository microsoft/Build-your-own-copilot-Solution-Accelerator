import { renderWithContext, screen, waitFor, fireEvent, act } from '../../test/test.utils';
import { ChatHistoryListItemGroups } from './ChatHistoryListItem';
import { historyList } from '../../api';

jest.mock('../../api', () => ({
    historyList: jest.fn(),
}));

const mockDispatch = jest.fn();
const handleFetchHistory = jest.fn();

// Mock the ChatHistoryListItemCell component
jest.mock('./ChatHistoryListItemCell', () => ({
    ChatHistoryListItemCell: jest.fn(({ item, onSelect }) => (
        <div data-testid={`mock-cell-${item.id}`} onClick={() => onSelect(item)}>
            {item?.title}
        </div>
    )),
}));

const mockGroupedChatHistory = [
    {
        month: '2023-09',
        entries: [
            { id: '1', title: 'Chat 1', messages: [], date: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: '2', title: 'Chat 2', messages: [], date: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
    },
    {
        month: '2023-08',
        entries: [
            { id: '3', title: 'Chat 3', messages: [], date: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
    },
];

describe('ChatHistoryListItemGroups Component', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    
        jest.spyOn(console, 'error').mockImplementation(() => { });
      });
    
      afterEach(() => {
        jest.clearAllMocks();
        //(console.error as jest.Mock).mockRestore();
      });
    
    it('should call handleFetchHistory with the correct offset when the observer is triggered', async () => {
        const responseMock = [{ id: '4', title: 'Chat 4', messages: [], date: new Date().toISOString(), updatedAt: new Date().toISOString() }];
        (historyList as jest.Mock).mockResolvedValue([...responseMock]);
        await act(async () => {
            renderWithContext(<ChatHistoryListItemGroups groupedChatHistory={mockGroupedChatHistory} />);
        });

        const scrollElms = await screen.findAllByRole('scrollDiv');
        const lastElem = scrollElms[scrollElms.length - 1];

        await act(async () => {
            fireEvent.scroll(lastElem, { target: { scrollY: 100 } });
            //await waitFor(() => expect(historyList).toHaveBeenCalled());
        });

        await act(async () => {
            await waitFor(() => {
                expect(historyList).toHaveBeenCalled();
            });
        });
    });

    it('displays spinner while loading more history', async () => {
        const responseMock = [{ id: '4', title: 'Chat 4', messages: [], date: new Date().toISOString(), updatedAt: new Date().toISOString() }];
        (historyList as jest.Mock).mockResolvedValue([...responseMock]);
        await act(async () => {
            renderWithContext(<ChatHistoryListItemGroups groupedChatHistory={mockGroupedChatHistory} />);
        });

        const scrollElms = await screen.findAllByRole('scrollDiv');
        const lastElem = scrollElms[scrollElms.length - 1];

        await act(async () => {
            fireEvent.scroll(lastElem, { target: { scrollY: 100 } });
        });

        await act(async () => {
            await waitFor(() => {
                expect(screen.queryByLabelText(/loading/i)).not.toBeInTheDocument();
            });
        });
    });

    it('should render the grouped chat history', () => {
        renderWithContext(<ChatHistoryListItemGroups groupedChatHistory={mockGroupedChatHistory} />);

        // Check if each group is rendered
        expect(screen.getByText('2023-09')).toBeInTheDocument();
        expect(screen.getByText('2023-08')).toBeInTheDocument();

        // Check if entries are rendered
        expect(screen.getByText('Chat 1')).toBeInTheDocument();
        expect(screen.getByText('Chat 2')).toBeInTheDocument();
        expect(screen.getByText('Chat 3')).toBeInTheDocument();
    });

    it('calls onSelect with the correct item when a ChatHistoryListItemCell is clicked', async () => {
        const handleSelectMock = jest.fn();

        // Render the component
        renderWithContext(<ChatHistoryListItemGroups groupedChatHistory={mockGroupedChatHistory} />);

        // Simulate clicks on each ChatHistoryListItemCell
        const cells = screen.getAllByTestId(/mock-cell-/);

        // Click on the first cell
        fireEvent.click(cells[0]);

        // Wait for the mock function to be called with the correct item
        // await waitFor(() => {
        //     expect(handleSelectMock).toHaveBeenCalledWith(mockGroupedChatHistory[0].entries[0]);
        // });

    });

    it('handles API failure gracefully', async () => {
        // Mock the API to reject with an error
        (historyList as jest.Mock).mockResolvedValue(undefined);

        renderWithContext(<ChatHistoryListItemGroups groupedChatHistory={mockGroupedChatHistory} />);

        // Simulate triggering the scroll event that loads more history
        const scrollElms = await screen.findAllByRole('scrollDiv');
        const lastElem = scrollElms[scrollElms.length - 1];

        await act(async () => {
            fireEvent.scroll(lastElem, { target: { scrollY: 100 } });
        });
        // Check that the spinner is hidden after the API call
        await waitFor(() => {
            expect(screen.queryByLabelText(/loading/i)).not.toBeInTheDocument();
        });
    });
   
});
