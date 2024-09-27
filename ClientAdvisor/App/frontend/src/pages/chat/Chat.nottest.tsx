import { renderWithContext, screen, waitFor, fireEvent, act } from '../../test/test.utils';
import Chat from './Chat';
import { ChatHistoryLoadingState, CosmosDBStatus } from '../../api/models';

import { getUserInfo, historyGenerate } from '../../api';
import userEvent from '@testing-library/user-event';
//import uuid from 'react-uuid';



// Mock the react-uuid module
jest.mock('react-uuid', () => jest.fn(() => 'mock-uuid'));


// Mocking necessary modules and components
jest.mock('../../api', () => ({
    getUserInfo: jest.fn(),
    historyClear: jest.fn(),
    historyGenerate: jest.fn()
}));

//const t1 = uuid();
// jest.mock('react-uuid', () =>{
//      jest.fn(() => 'mock-uuid')
// });

//const uuid = jest.fn().mockReturnValue('42');

// jest.mock('react-uuid', () => ({
//     v4: jest.fn(() => 'mock-uuid'),
// }));

jest.mock('./Components/ChatMessageContainer', () => ({
    ChatMessageContainer: jest.fn(() => <div>ChatMessageContainerMock</div>),
}));
jest.mock('./Components/CitationPanel', () => ({
    CitationPanel: jest.fn(() => <div>CitationPanel Mock Component</div>),
}));
jest.mock('./Components/AuthNotConfigure', () => ({
    AuthNotConfigure: jest.fn(() => <div>AuthNotConfigure Mock</div>),
}));
jest.mock('../../components/QuestionInput', () => ({
    QuestionInput: jest.fn(() => <div>QuestionInputMock</div>),
}));
jest.mock('../../components/ChatHistory/ChatHistoryPanel', () => ({
    ChatHistoryPanel: jest.fn(() => <div>ChatHistoryPanelMock</div>),
}));
jest.mock('../../components/PromptsSection/PromptsSection', () => ({
    PromptsSection: jest.fn((props: any) => <div onClick={() => props.onClickPrompt({
        name: 'Test',
        question: 'question',
        key: 'key'
    }
    )}>PromptsSectionMock</div>),
}));

const mockDispatch = jest.fn();
const originalHostname = window.location.hostname;

describe("Chat Component", () => {
    beforeEach(() => {
        //jest.clearAllMocks();
        global.fetch = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        //jest.resetAllMocks();
        jest.clearAllMocks();

        Object.defineProperty(window, 'location', {
            value: { hostname: originalHostname },
            writable: true,
        });

    });

    
    test('Should show Auth not configured when userList length zero', async () => {
        Object.defineProperty(window, 'location', {
            value: { hostname: '127.0.0.11' },
            writable: true,
        });
        const mockPayload: any[] = [];
        (getUserInfo as jest.Mock).mockResolvedValue([...mockPayload]);
        //const result = await getUserInfo();
        const initialState = {
            frontendSettings: {
                ui: {
                    chat_logo: '',
                    chat_title: 'chat_title',
                    chat_description: 'chat_description'

                },
                auth_enabled: true
            }

        };
        renderWithContext(<Chat />, initialState)
        await waitFor(() => {
            // screen.debug();
            expect(screen.queryByText("AuthNotConfigure Mock")).toBeInTheDocument();
        });
    })

    test('Should not show Auth not configured when userList length > 0', async () => {
        Object.defineProperty(window, 'location', {
            value: { hostname: '127.0.0.1' },
            writable: true,
        });
        const mockPayload: any[] = [{ id: 1, name: 'User' }];
        (getUserInfo as jest.Mock).mockResolvedValue([...mockPayload]);
        //const result = await getUserInfo();
        const initialState = {
            frontendSettings: {
                ui: {
                    chat_logo: '',
                    chat_title: 'chat_title',
                    chat_description: 'chat_description'

                },
                auth_enabled: true
            }

        };
        renderWithContext(<Chat />, initialState)
        await waitFor(() => {
            expect(screen.queryByText("AuthNotConfigure Mock")).not.toBeInTheDocument();
        });
    })



    test('renders chat component with empty state', () => {
        const mockAppState = {
            frontendSettings: {
                ui: { chat_logo: null, chat_title: 'Mock Title', chat_description: 'Mock Description' },
                auth_enabled: false,
            },
            isCosmosDBAvailable: { status: CosmosDBStatus.Working, cosmosDB: false },
            chatHistoryLoadingState: ChatHistoryLoadingState.Loading,
        };

        renderWithContext(<Chat />, mockAppState);

        expect(screen.getByText('Mock Title')).toBeInTheDocument();
        expect(screen.getByText('Mock Description')).toBeInTheDocument();
        //expect(screen.getByText('PromptsSectionMock')).toBeInTheDocument();
    });



    test('displays error dialog when CosmosDB status is not working', async () => {
        const mockAppState = {
            isCosmosDBAvailable: { status: CosmosDBStatus.NotWorking },
            chatHistoryLoadingState: ChatHistoryLoadingState.Fail,
        };

        renderWithContext(<Chat />, mockAppState);

        expect(await screen.findByText('Chat history is not enabled')).toBeInTheDocument();
    });

    test('clears chat history on clear chat button click', async () => {
        const mockAppState = {
            currentChat: { id: 'chat-id' },
            isCosmosDBAvailable: { cosmosDB: true },
            chatHistoryLoadingState: ChatHistoryLoadingState.NotStarted,
        };

        const { historyClear } = require('../../api');
        historyClear.mockResolvedValue({ ok: true });

        renderWithContext(<Chat />, mockAppState);

        const clearChatButton = screen.getByRole('button', { name: /clear chat/i });
        fireEvent.click(clearChatButton);

        await waitFor(() => {
            expect(historyClear).toHaveBeenCalledWith('chat-id');
        });
    });

    test('displays error message on clear chat failure', async () => {
        const mockAppState = {
            currentChat: { id: 'chat-id' },
            isCosmosDBAvailable: { cosmosDB: true },
            chatHistoryLoadingState: ChatHistoryLoadingState.NotStarted,
        };

        const { historyClear } = require('../../api');
        historyClear.mockResolvedValue({ ok: false });

        renderWithContext(<Chat />, mockAppState);

        const clearChatButton = screen.getByRole('button', { name: /clear chat/i });
        fireEvent.click(clearChatButton);

        await waitFor(() => {
            expect(screen.getByText('Error clearing current chat')).toBeInTheDocument();
        });
    });


    test('on prompt click handler', async () => {
        const mockResponse = {
            body: {
                getReader: jest.fn().mockReturnValue({
                    read: jest.fn()
                        .mockResolvedValueOnce({
                            done: false,
                            value: new TextEncoder().encode(JSON.stringify({
                                choices: [{
                                    messages: [{
                                        role: 'assistant',
                                        content: 'Hello!'
                                    }]
                                }]
                            }))

                        })
                        .mockResolvedValueOnce({
                            done: true
                        }),
                }),
            },
        };
        (historyGenerate as jest.Mock).mockResolvedValueOnce({ ok: true, ...mockResponse });

        const mockAppState = {
            frontendSettings: {
                ui: { chat_logo: null, chat_title: 'Mock Title 1', chat_description: 'Mock Description 1' },
                auth_enabled: false,
            },
            isCosmosDBAvailable: { status: CosmosDBStatus.Working, cosmosDB: true },
            chatHistoryLoadingState: ChatHistoryLoadingState.Success
        };
        await act(() => {
            renderWithContext(<Chat />, mockAppState);
        })

        const promptele = await screen.findByText('PromptsSectionMock');
        await userEvent.click(promptele)
        screen.debug();

        const stopGenBtnEle = screen.findByText("Stop generating");
        //expect(stopGenBtnEle).toBeInTheDocument();


    });


    test('on prompt click handler failed API', async () => {
        const mockErrorResponse = {
            error: 'Some error occurred',
          };
          (historyGenerate as jest.Mock).mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValueOnce(mockErrorResponse) });
      
          await act(async () => {
            // Trigger the function that includes the API call
          });

        const mockAppState = {
            frontendSettings: {
                ui: { chat_logo: null, chat_title: 'Mock Title 1', chat_description: 'Mock Description 1' },
                auth_enabled: false,
            },
            isCosmosDBAvailable: { status: CosmosDBStatus.Working, cosmosDB: true },
            chatHistoryLoadingState: ChatHistoryLoadingState.Success
        };
        await act(() => {
            renderWithContext(<Chat />, mockAppState);
        })

        const promptele = await screen.findByText('PromptsSectionMock');
        await userEvent.click(promptele)

    });

    

    test('Should able to click button start a new chat button', async() => {
        userEvent.setup();
        const mockAppState = {
            frontendSettings: {
                ui: { chat_logo: null, chat_title: 'Mock Title', chat_description: 'Mock Description' },
                auth_enabled: false,
            },
            isCosmosDBAvailable: { status: CosmosDBStatus.Working, cosmosDB: false },
            chatHistoryLoadingState: ChatHistoryLoadingState.Loading,
        };

        renderWithContext(<Chat />, mockAppState);

        const startBtnEle = screen.getByRole('button', {name : 'start a new chat button'});
        expect(startBtnEle).toBeInTheDocument();
        await userEvent.click(startBtnEle)

        await waitFor(()=>{
            expect(screen.queryByText('CitationPanel Mock Component')).not.toBeInTheDocument();
        })
    });

    test('Should able to click the stop generating the button', async() => {
        userEvent.setup();
        const mockAppState = {
            frontendSettings: {
                ui: { chat_logo: null, chat_title: 'Mock Title', chat_description: 'Mock Description' },
                auth_enabled: false,
            },
            isCosmosDBAvailable: { status: CosmosDBStatus.Working, cosmosDB: false },
            chatHistoryLoadingState: ChatHistoryLoadingState.Loading,
        };

        renderWithContext(<Chat />, mockAppState);

        const stopBtnEle = screen.getByRole('button', {name : 'Stop generating'});
        expect(stopBtnEle).toBeInTheDocument();
        await userEvent.click(stopBtnEle)

        // await waitFor(()=>{
        //     expect(screen.queryByText('CitationPanel Mock Component')).not.toBeInTheDocument();
        // })
    });

});
