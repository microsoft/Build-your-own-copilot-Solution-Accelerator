import { renderWithContext, screen, waitFor, fireEvent, act } from '../../test/test.utils'
import Chat from './Chat'
import { ChatHistoryLoadingState } from '../../api/models'

import {
  getUserInfo,
  conversationApi,
  historyGenerate,
  historyClear,
  ChatMessage,
  Citation,
  historyUpdate,
  CosmosDBStatus
} from '../../api'
import userEvent from '@testing-library/user-event'

import { AIResponseContent, decodedConversationResponseWithCitations } from '../../../__mocks__/mockAPIData'
import { CitationPanel } from './Components/CitationPanel'
// import { BuildingCheckmarkRegular } from '@fluentui/react-icons';

// Mocking necessary modules and components
jest.mock('../../api/api', () => ({
  getUserInfo: jest.fn(),
  historyClear: jest.fn(),
  historyGenerate: jest.fn(),
  historyUpdate: jest.fn(),
  conversationApi: jest.fn()
}))

interface ChatMessageContainerProps {
  messages: ChatMessage[]
  isLoading: boolean
  showLoadingMessage: boolean
  onShowCitation: (citation: Citation) => void
}

const citationObj = {
  id: '123',
  content: 'This is a sample citation content.',
  title: 'Test Citation with Blob URL',
  url: 'https://test.core.example.com/resource',
  filepath: 'path',
  metadata: '',
  chunk_id: '',
  reindex_id: ''
}
jest.mock('./Components/ChatMessageContainer', () => ({
  ChatMessageContainer: jest.fn((props: ChatMessageContainerProps) => {
    return (
      <div data-testid="chat-message-container">
        <h3>ChatMessageContainerMock</h3>
        {props.messages.map((message: any, index: number) => {
          return (
            <>
              <p>{message.role}</p>
              <p>{message.content}</p>
            </>
          )
        })}
        <button aria-label={'citation-btn'} onClick={() => props.onShowCitation(citationObj)}>
          {' '}
          Show Citation
        </button>
        <div id="chatMessagesContainer" />
      </div>
    )
  })
}))
jest.mock('./Components/CitationPanel', () => ({
  CitationPanel: jest.fn((props: any) => {
    return (
      <>
        <div data-testid="citationPanel">CitationPanel Mock Component</div>
        <p>{props.activeCitation.title}</p>
        <button aria-label="bobURL" onClick={() => props.onViewSource(props.activeCitation)}>
          BOB URL
        </button>
      </>
    )
  })
}))
jest.mock('./Components/AuthNotConfigure', () => ({
  AuthNotConfigure: jest.fn(() => <div>AuthNotConfigure Mock</div>)
}))
jest.mock('../../components/QuestionInput', () => ({
  QuestionInput: jest.fn((props: any) => (
    <div>
      <span>QuestionInputMock</span>
      <button aria-label="question-input" onClick={() => props.onSend('List of Documents', props.conversationId)}>
        Click
      </button>

      <button aria-label="question-dummy" onClick={() => props.onSend('List of Documents', '123')}>
        Click Dummy
      </button>
    </div>
  ))
}))
jest.mock('../../components/ChatHistory/ChatHistoryPanel', () => ({
  ChatHistoryPanel: jest.fn(() => <div>ChatHistoryPanelMock</div>)
}))
jest.mock('../../components/PromptsSection/PromptsSection', () => ({
  PromptsSection: jest.fn((props: any) => (
    <div
      role="button"
      aria-label={'prompt-button'}
      onClick={() =>
        props.onClickPrompt({ name: 'Top discussion trends', question: 'Top discussion trends', key: 'p1' })
      }>
      PromptsSectionMock
    </div>
  ))
}))

const mockDispatch = jest.fn()
const originalHostname = window.location.hostname

const mockState = {
  isChatHistoryOpen: false,
  chatHistoryLoadingState: 'success',
  chatHistory: [],
  filteredChatHistory: null,
  currentChat: null,
  isCosmosDBAvailable: {
    cosmosDB: true,
    status: 'CosmosDB is configured and working'
  },
  frontendSettings: {
    auth_enabled: true,
    feedback_enabled: 'conversations',
    sanitize_answer: false,
    ui: {
      chat_description: 'This chatbot is configured to answer your questions',
      chat_logo: null,
      chat_title: 'Start chatting',
      logo: null,
      show_share_button: true,
      title: 'Woodgrove Bank'
    }
  },
  feedbackState: {},
  clientId: '10002',
  isRequestInitiated: false,
  isLoader: false
}

const mockStateWithChatHistory = {
  ...mockState,
  chatHistory: [
    {
      id: '408a43fb-0f60-45e4-8aef-bfeb5cb0afb6',
      title: 'Summarize Alexander Harrington previous meetings',
      date: '2024-10-08T10:22:01.413959',
      messages: [
        {
          id: 'b0fb6917-632d-4af5-89ba-7421d7b378d6',
          role: 'user',
          date: '2024-10-08T10:22:02.889348',
          content: 'Summarize Alexander Harrington previous meetings',
          feedback: ''
        }
      ]
    },
    {
      id: 'ebe3ee4d-2a7c-4a31-bca3-2ccc14d7b5db',
      title: 'Inquiry on Data Presentation',
      messages: [
        {
          id: 'd5811d9f-9f0f-d6c8-61a8-3e25f2df7b51',
          role: 'user',
          content: 'test data',
          date: '2024-10-08T13:17:36.495Z'
        },
        {
          role: 'assistant',
          content: 'I cannot answer this question from the data available. Please rephrase or add more details.',
          id: 'c53d6702-9ca0-404a-9306-726f19ee80ba',
          date: '2024-10-08T13:18:57.083Z'
        }
      ],
      date: '2024-10-08T13:17:40.827540'
    }
  ],
  currentChat: {
    id: 'ebe3ee4d-2a7c-4a31-bca3-2ccc14d7b5db',
    title: 'Inquiry on Data Presentation',
    messages: [
      {
        id: 'd5811d9f-9f0f-d6c8-61a8-3e25f2df7b51',
        role: 'user',
        content: 'test data',
        date: '2024-10-08T13:17:36.495Z'
      },
      {
        role: 'assistant',
        content: 'I cannot answer this question from the data available. Please rephrase or add more details.',
        id: 'c53d6702-9ca0-404a-9306-726f19ee80ba',
        date: '2024-10-08T13:18:57.083Z'
      }
    ],
    date: '2024-10-08T13:17:40.827540'
  }
}

const response = {
  id: 'cb010365-18d7-41a8-aef6-8c68f9418bb7',
  model: 'gpt-4',
  created: 1728388001,
  object: 'extensions.chat.completion.chunk',
  choices: [
    {
      messages: [
        {
          role: 'assistant',
          content: 'response from AI!',
          id: 'cb010365-18d7-41a8-aef6-8c68f9418bb7',
          date: '2024-10-08T11:46:48.585Z'
        }
      ]
    }
  ],
  history_metadata: {
    conversation_id: '96bffdc3-cd72-4b4b-b257-67a0b161ab43'
  },
  'apim-request-id': ''
}

const response2 = {
  id: 'cb010365-18d7-41a8-aef6-8c68f9418bb7',
  model: 'gpt-4',
  created: 1728388001,
  object: 'extensions.chat.completion.chunk',
  choices: [
    {
      messages: [
        {
          role: 'assistant',
          id: 'cb010365-18d7-41a8-aef6-8c68f9418bb7',
          date: '2024-10-08T11:46:48.585Z'
        }
      ]
    }
  ],

  'apim-request-id': ''
}

const noContentResponse = {
  id: 'cb010365-18d7-41a8-aef6-8c68f9418bb7',
  model: 'gpt-4',
  created: 1728388001,
  object: 'extensions.chat.completion.chunk',
  choices: [
    {
      messages: [
        {
          role: 'assistant',
          id: 'cb010365-18d7-41a8-aef6-8c68f9418bb7',
          date: '2024-10-08T11:46:48.585Z'
        }
      ]
    }
  ],
  history_metadata: {
    conversation_id: '3692f941-85cb-436c-8c32-4287fe885782'
  },
  'apim-request-id': ''
}

const response3 = {
  id: 'cb010365-18d7-41a8-aef6-8c68f9418bb7',
  model: 'gpt-4',
  created: 1728388001,
  object: 'extensions.chat.completion.chunk',
  choices: [
    {
      messages: [
        {
          role: 'assistant',
          content: 'response from AI content!',
          context: 'response from AI context!',
          id: 'cb010365-18d7-41a8-aef6-8c68f9418bb7',
          date: '2024-10-08T11:46:48.585Z'
        }
      ]
    }
  ],
  history_metadata: {
    conversation_id: '3692f941-85cb-436c-8c32-4287fe885782'
  },
  'apim-request-id': ''
}

//---ConversationAPI Response

const addToExistResponse = {
  id: 'cb010365-18d7-41a8-aef6-8c68f9418bb7',
  model: 'gpt-4',
  created: 1728388001,
  object: 'extensions.chat.completion.chunk',
  choices: [
    {
      messages: [
        {
          role: 'assistant',
          content: 'response from AI content!',
          context: 'response from AI context!',
          id: 'cb010365-18d7-41a8-aef6-8c68f9418bb7',
          date: '2024-10-08T11:46:48.585Z'
        }
      ]
    }
  ],
  history_metadata: {
    conversation_id: '3692f941-85cb-436c-8c32-4287fe885782'
  },
  'apim-request-id': ''
}

//-----ConversationAPI Response

const response4 = {}

let originalFetch: typeof global.fetch

describe('Chat Component', () => {
  let mockCallHistoryGenerateApi: any
  let historyUpdateApi: any
  let mockCallConversationApi: any

  let mockAbortController: any

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  const delayedHistoryGenerateAPIcallMock = () => {
    const mockResponse = {
      body: {
        getReader: jest.fn().mockReturnValue({
          read: jest
            .fn()
            .mockResolvedValueOnce(
              delay(5000).then(() => ({
                done: false,
                value: new TextEncoder().encode(JSON.stringify(decodedConversationResponseWithCitations))
              }))
            )
            .mockResolvedValueOnce({
              done: true,
              value: new TextEncoder().encode(JSON.stringify({}))
            })
        })
      }
    }

    mockCallHistoryGenerateApi.mockResolvedValueOnce({ ok: true, ...mockResponse })
  }

  const historyGenerateAPIcallMock = () => {
    const mockResponse = {
      body: {
        getReader: jest.fn().mockReturnValue({
          read: jest
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(JSON.stringify(response3))
            })
            .mockResolvedValueOnce({
              done: true,
              value: new TextEncoder().encode(JSON.stringify({}))
            })
        })
      }
    }
    mockCallHistoryGenerateApi.mockResolvedValueOnce({ ok: true, ...mockResponse })
  }

  const nonDelayedhistoryGenerateAPIcallMock = (type = '') => {
    let mockResponse = {}
    switch (type) {
      case 'no-content-history':
        mockResponse = {
          body: {
            getReader: jest.fn().mockReturnValue({
              read: jest
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(JSON.stringify(response2))
                })
                .mockResolvedValueOnce({
                  done: true,
                  value: new TextEncoder().encode(JSON.stringify({}))
                })
            })
          }
        }
        break
      case 'no-content':
        mockResponse = {
          body: {
            getReader: jest.fn().mockReturnValue({
              read: jest
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(JSON.stringify(noContentResponse))
                })
                .mockResolvedValueOnce({
                  done: true,
                  value: new TextEncoder().encode(JSON.stringify({}))
                })
            })
          }
        }
        break
      case 'incompleteJSON':
        mockResponse = {
          body: {
            getReader: jest.fn().mockReturnValue({
              read: jest
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode('{"incompleteJson": ')
                })
                .mockResolvedValueOnce({
                  done: true,
                  value: new TextEncoder().encode(JSON.stringify({}))
                })
            })
          }
        }
        break
      case 'no-result':
        mockResponse = {
          body: {
            getReader: jest.fn().mockReturnValue({
              read: jest
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(JSON.stringify({}))
                })
                .mockResolvedValueOnce({
                  done: true,
                  value: new TextEncoder().encode(JSON.stringify({}))
                })
            })
          }
        }
        break
      default:
        mockResponse = {
          body: {
            getReader: jest.fn().mockReturnValue({
              read: jest
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(JSON.stringify(response))
                })
                .mockResolvedValueOnce({
                  done: true,
                  value: new TextEncoder().encode(JSON.stringify({}))
                })
            })
          }
        }
        break
    }

    mockCallHistoryGenerateApi.mockResolvedValueOnce({ ok: true, ...mockResponse })
  }

  const conversationApiCallMock = (type = '') => {
    let mockResponse: any
    switch (type) {
      case 'incomplete-result':
        mockResponse = {
          body: {
            getReader: jest.fn().mockReturnValue({
              read: jest
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode('{"incompleteJson": ')
                })
                .mockResolvedValueOnce({
                  done: true,
                  value: new TextEncoder().encode(JSON.stringify({}))
                })
            })
          }
        }

        break
      case 'error-string-result':
        mockResponse = {
          body: {
            getReader: jest.fn().mockReturnValue({
              read: jest
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(JSON.stringify({ error: 'error API result' }))
                })
                .mockResolvedValueOnce({
                  done: true,
                  value: new TextEncoder().encode(JSON.stringify({}))
                })
            })
          }
        }
        break
      case 'error-result':
        mockResponse = {
          body: {
            getReader: jest.fn().mockReturnValue({
              read: jest
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(JSON.stringify({ error: { message: 'error API result' } }))
                })
                .mockResolvedValueOnce({
                  done: true,
                  value: new TextEncoder().encode(JSON.stringify({}))
                })
            })
          }
        }
        break
      case 'chat-item-selected':
        mockResponse = {
          body: {
            getReader: jest.fn().mockReturnValue({
              read: jest
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(JSON.stringify(addToExistResponse))
                })
                .mockResolvedValueOnce({
                  done: true,
                  value: new TextEncoder().encode(JSON.stringify({}))
                })
            })
          }
        }
        break
      default:
        mockResponse = {
          body: {
            getReader: jest.fn().mockReturnValue({
              read: jest
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(JSON.stringify(response))
                })
                .mockResolvedValueOnce({
                  done: true,
                  value: new TextEncoder().encode(JSON.stringify({}))
                })
            })
          }
        }
        break
    }

    mockCallConversationApi.mockResolvedValueOnce({ ...mockResponse })
  }
  const setIsVisible = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
    originalFetch = global.fetch
    global.fetch = jest.fn()

    mockAbortController = new AbortController()
    //jest.spyOn(mockAbortController.signal, 'aborted', 'get').mockReturnValue(false);

    mockCallHistoryGenerateApi = historyGenerate as jest.Mock
    mockCallHistoryGenerateApi.mockClear()

    historyUpdateApi = historyUpdate as jest.Mock
    historyUpdateApi.mockClear()

    mockCallConversationApi = conversationApi as jest.Mock
    mockCallConversationApi.mockClear()

    // jest.useFakeTimers(); // Mock timers before each test
    jest.spyOn(console, 'error').mockImplementation(() => {})

    Object.defineProperty(HTMLElement.prototype, 'scroll', {
      configurable: true,
      value: jest.fn() // Mock implementation
    })

    jest.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    // jest.clearAllMocks();
    // jest.useRealTimers(); // Reset timers after each test
    jest.restoreAllMocks()
    // Restore original global fetch after each test
    global.fetch = originalFetch
    Object.defineProperty(window, 'location', {
      value: { hostname: originalHostname },
      writable: true
    })

    jest.clearAllTimers() // Ensures no fake timers are left running
    mockCallHistoryGenerateApi.mockReset()

    historyUpdateApi.mockReset()
    mockCallConversationApi.mockReset()
  })

  test('Should show Auth not configured when userList length zero', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: '127.0.0.11' },
      writable: true
    })
    const mockPayload: any[] = []
    ;(getUserInfo as jest.Mock).mockResolvedValue([...mockPayload])

    renderWithContext(<Chat setIsVisible={setIsVisible} />, mockState)
    await waitFor(() => {
      expect(screen.queryByText('AuthNotConfigure Mock')).toBeInTheDocument()
    })
  })

  test('Should not show Auth not configured when userList length > 0', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: '127.0.0.1' },
      writable: true
    })
    const mockPayload: any[] = [{ id: 1, name: 'User' }]
    ;(getUserInfo as jest.Mock).mockResolvedValue([...mockPayload])
    renderWithContext(<Chat setIsVisible={setIsVisible} />, mockState)
    await waitFor(() => {
      expect(screen.queryByText('AuthNotConfigure Mock')).not.toBeInTheDocument()
    })
  })

  test('Should not show Auth not configured when auth_enabled is false', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: '127.0.0.1' },
      writable: true
    })
    const mockPayload: any[] = []
    ;(getUserInfo as jest.Mock).mockResolvedValue([...mockPayload])
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    await waitFor(() => {
      expect(screen.queryByText('AuthNotConfigure Mock')).not.toBeInTheDocument()
    })
  })

  test('Should load chat component when Auth configured', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: '127.0.0.1' },
      writable: true
    })
    const mockPayload: any[] = [{ id: 1, name: 'User' }]
    ;(getUserInfo as jest.Mock).mockResolvedValue([...mockPayload])
    renderWithContext(<Chat setIsVisible={setIsVisible} />, mockState)
    await waitFor(() => {
      expect(screen.queryByText('Start chatting')).toBeInTheDocument()
      expect(screen.queryByText('This chatbot is configured to answer your questions')).toBeInTheDocument()
    })
  })

  test('Prompt tags on click handler when response is inprogress', async () => {
    userEvent.setup()
    delayedHistoryGenerateAPIcallMock()
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = await screen.findByRole('button', { name: /prompt-button/i })
    await act(() => {
      userEvent.click(promptButton)
    })
    const stopGenBtnEle = await screen.findByText('Stop generating')
    expect(stopGenBtnEle).toBeInTheDocument()
  })

  test('Should handle error : when stream object does not have content property', async () => {
    userEvent.setup()

    nonDelayedhistoryGenerateAPIcallMock('no-content')
    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }

    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    await userEvent.click(promptButton)

    await waitFor(() => {
      expect(screen.getByText(/An error occurred. No content in messages object./i)).toBeInTheDocument()
    })
  })

  test('Should handle error : when stream object does not have content property and history_metadata', async () => {
    userEvent.setup()

    nonDelayedhistoryGenerateAPIcallMock('no-content-history')
    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }

    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    await userEvent.click(promptButton)

    await waitFor(() => {
      expect(screen.getByText(/An error occurred. No content in messages object./i)).toBeInTheDocument()
    })
  })

  test('Stop generating button click', async () => {
    userEvent.setup()
    delayedHistoryGenerateAPIcallMock()
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = await screen.findByRole('button', { name: /prompt-button/i })
    await act(() => {
      userEvent.click(promptButton)
    })
    const stopGenBtnEle = await screen.findByText('Stop generating')
    await userEvent.click(stopGenBtnEle)

    await waitFor(() => {
      const stopGenBtnEle = screen.queryByText('Stop generating')
      expect(stopGenBtnEle).not.toBeInTheDocument()
    })
  })

  test('Stop generating when enter key press on button', async () => {
    userEvent.setup()
    delayedHistoryGenerateAPIcallMock()
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = await screen.findByRole('button', { name: /prompt-button/i })
    await act(() => {
      userEvent.click(promptButton)
    })
    const stopGenBtnEle = await screen.findByText('Stop generating')
    await fireEvent.keyDown(stopGenBtnEle, { key: 'Enter', code: 'Enter', charCode: 13 })

    await waitFor(() => {
      const stopGenBtnEle = screen.queryByText('Stop generating')
      expect(stopGenBtnEle).not.toBeInTheDocument()
    })
  })

  test('Stop generating when space key press on button', async () => {
    userEvent.setup()
    delayedHistoryGenerateAPIcallMock()
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = await screen.findByRole('button', { name: /prompt-button/i })
    await act(() => {
      userEvent.click(promptButton)
    })
    const stopGenBtnEle = await screen.findByText('Stop generating')
    await fireEvent.keyDown(stopGenBtnEle, { key: ' ', code: 'Space', charCode: 32 })

    await waitFor(() => {
      const stopGenBtnEle = screen.queryByText('Stop generating')
      expect(stopGenBtnEle).not.toBeInTheDocument()
    })
  })

  test('Should not call stopGenerating method when key press other than enter/space/click', async () => {
    userEvent.setup()
    delayedHistoryGenerateAPIcallMock()
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = await screen.findByRole('button', { name: /prompt-button/i })
    await act(() => {
      userEvent.click(promptButton)
    })
    const stopGenBtnEle = await screen.findByText('Stop generating')
    await fireEvent.keyDown(stopGenBtnEle, { key: 'a', code: 'KeyA' })

    await waitFor(() => {
      const stopGenBtnEle = screen.queryByText('Stop generating')
      expect(stopGenBtnEle).toBeInTheDocument()
    })
  })

  test('should handle historyGenerate API failure correctly', async () => {
    const mockError = new Error('API request failed')
    mockCallHistoryGenerateApi.mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValueOnce(mockError) })

    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)

    const promptButton = await screen.findByRole('button', { name: /prompt-button/i })

    await userEvent.click(promptButton)

    await waitFor(() => {
      expect(
        screen.getByText(
          /There was an error generating a response. Chat history can't be saved at this time. Please try again/i
        )
      ).toBeInTheDocument()
    })
  })

  test('should handle historyGenerate API failure when chathistory item selected', async () => {
    const mockError = new Error('API request failed')
    mockCallHistoryGenerateApi.mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValueOnce(mockError) })

    const tempMockState = { ...mockStateWithChatHistory }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)

    const promptButton = await screen.findByRole('button', { name: /prompt-button/i })

    await act(async () => {
      await userEvent.click(promptButton)
    })
    await waitFor(() => {
      expect(
        screen.getByText(
          /There was an error generating a response. Chat history can't be saved at this time. Please try again/i
        )
      ).toBeInTheDocument()
    })
  })

  test('Prompt tags on click handler when response rendering', async () => {
    userEvent.setup()

    nonDelayedhistoryGenerateAPIcallMock()
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    await userEvent.click(promptButton)

    await waitFor(async () => {
      //expect(await screen.findByText(/response from AI!/i)).toBeInTheDocument();
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
    })
  })

  test('Should handle historyGenerate API returns incomplete JSON', async () => {
    userEvent.setup()

    nonDelayedhistoryGenerateAPIcallMock('incompleteJSON')
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    await userEvent.click(promptButton)

    await waitFor(async () => {
      expect(
        screen.getByText(
          /An error occurred. Please try again. If the problem persists, please contact the site administrator/i
        )
      ).toBeInTheDocument()
    })
  })

  test('Should handle historyGenerate API returns empty object or null', async () => {
    userEvent.setup()

    nonDelayedhistoryGenerateAPIcallMock('no-result')
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    await userEvent.click(promptButton)

    await waitFor(async () => {
      expect(
        screen.getByText(/There was an error generating a response. Chat history can't be saved at this time./i)
      ).toBeInTheDocument()
    })
  })

  test('Should render if conversation API return context along with content', async () => {
    userEvent.setup()

    historyGenerateAPIcallMock()
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    userEvent.click(promptButton)

    await waitFor(() => {
      expect(screen.getByText(/response from AI content/i)).toBeInTheDocument()
      expect(screen.getByText(/response from AI context/i)).toBeInTheDocument()
    })
  })

  test('Should handle onShowCitation method when citation button click', async () => {
    userEvent.setup()

    nonDelayedhistoryGenerateAPIcallMock()
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    await userEvent.click(promptButton)

    await waitFor(() => {
      //expect(screen.getByText(/response from AI!/i)).toBeInTheDocument();
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
    })

    const mockCitationBtn = await screen.findByRole('button', { name: /citation-btn/i })

    await act(async () => {
      await userEvent.click(mockCitationBtn)
    })

    await waitFor(async () => {
      expect(await screen.findByTestId('citationPanel')).toBeInTheDocument()
    })
  })

  test('Should open citation URL in new window onclick of URL button', async () => {
    userEvent.setup()

    nonDelayedhistoryGenerateAPIcallMock()
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    await userEvent.click(promptButton)

    await waitFor(() => {
      //expect(screen.getByText(/response from AI!/i)).toBeInTheDocument();
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
    })

    const mockCitationBtn = await screen.findByRole('button', { name: /citation-btn/i })

    await act(async () => {
      await userEvent.click(mockCitationBtn)
    })

    await waitFor(async () => {
      expect(await screen.findByTestId('citationPanel')).toBeInTheDocument()
    })
    const URLEle = await screen.findByRole('button', { name: /bobURL/i })

    await userEvent.click(URLEle)
    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(citationObj.url, '_blank')
    })
  })

  test('Should be clear the chat on Clear Button Click ', async () => {
    userEvent.setup()
    nonDelayedhistoryGenerateAPIcallMock()
    ;(historyClear as jest.Mock).mockResolvedValueOnce({ ok: true })
    const tempMockState = {
      ...mockState,
      currentChat: {
        id: 'ebe3ee4d-2a7c-4a31-bca3-2ccc14d7b5db',
        title: 'Inquiry on Data Presentation',
        messages: [
          {
            id: 'd5811d9f-9f0f-d6c8-61a8-3e25f2df7b51',
            role: 'user',
            content: 'test data',
            date: '2024-10-08T13:17:36.495Z'
          },
          {
            role: 'assistant',
            content: 'I cannot answer this question from the data available. Please rephrase or add more details.',
            id: 'c53d6702-9ca0-404a-9306-726f19ee80ba',
            date: '2024-10-08T13:18:57.083Z'
          }
        ],
        date: '2024-10-08T13:17:40.827540'
      }
    }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)

    await waitFor(() => {
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
    })

    const clearBtn = screen.getByRole('button', { name: /clear chat button/i })
    //const clearBtn = screen.getByTestId("clearChatBtn");

    await act(() => {
      fireEvent.click(clearBtn)
    })
  })

  test('Should open error dialog when handle historyClear failure ', async () => {
    userEvent.setup()
    nonDelayedhistoryGenerateAPIcallMock()
    ;(historyClear as jest.Mock).mockResolvedValueOnce({ ok: false })
    const tempMockState = {
      ...mockState,
      currentChat: {
        id: 'ebe3ee4d-2a7c-4a31-bca3-2ccc14d7b5db',
        title: 'Inquiry on Data Presentation',
        messages: [
          {
            id: 'd5811d9f-9f0f-d6c8-61a8-3e25f2df7b51',
            role: 'user',
            content: 'test data',
            date: '2024-10-08T13:17:36.495Z'
          },
          {
            role: 'assistant',
            content: 'I cannot answer this question from the data available. Please rephrase or add more details.',
            id: 'c53d6702-9ca0-404a-9306-726f19ee80ba',
            date: '2024-10-08T13:18:57.083Z'
          }
        ],
        date: '2024-10-08T13:17:40.827540'
      }
    }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)

    await waitFor(() => {
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
    })

    const clearBtn = screen.getByRole('button', { name: /clear chat button/i })
    //const clearBtn = screen.getByTestId("clearChatBtn");

    await act(async () => {
      await userEvent.click(clearBtn)
    })

    await waitFor(async () => {
      expect(await screen.findByText(/Error clearing current chat/i)).toBeInTheDocument()
      expect(
        await screen.findByText(/Please try again. If the problem persists, please contact the site administrator./i)
      ).toBeInTheDocument()
    })
  })

  test('Should able to close error dialog when error dialog close button click ', async () => {
    userEvent.setup()
    nonDelayedhistoryGenerateAPIcallMock()
    ;(historyClear as jest.Mock).mockResolvedValueOnce({ ok: false })
    const tempMockState = {
      ...mockState,
      currentChat: {
        id: 'ebe3ee4d-2a7c-4a31-bca3-2ccc14d7b5db',
        title: 'Inquiry on Data Presentation',
        messages: [
          {
            id: 'd5811d9f-9f0f-d6c8-61a8-3e25f2df7b51',
            role: 'user',
            content: 'test data',
            date: '2024-10-08T13:17:36.495Z'
          },
          {
            role: 'assistant',
            content: 'I cannot answer this question from the data available. Please rephrase or add more details.',
            id: 'c53d6702-9ca0-404a-9306-726f19ee80ba',
            date: '2024-10-08T13:18:57.083Z'
          }
        ],
        date: '2024-10-08T13:17:40.827540'
      }
    }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)

    await waitFor(() => {
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
    })

    const clearBtn = screen.getByRole('button', { name: /clear chat button/i })

    await act(async () => {
      await userEvent.click(clearBtn)
    })

    await waitFor(async () => {
      expect(await screen.findByText(/Error clearing current chat/i)).toBeInTheDocument()
      expect(
        await screen.findByText(/Please try again. If the problem persists, please contact the site administrator./i)
      ).toBeInTheDocument()
    })
    const dialogCloseBtnEle = screen.getByRole('button', { name: 'Close' })
    await act(async () => {
      await userEvent.click(dialogCloseBtnEle)
    })

    await waitFor(
      () => {
        expect(screen.queryByText('Error clearing current chat')).not.toBeInTheDocument()
      },
      { timeout: 500 }
    )
  })

  test('Should be clear the chat on Start new chat button click ', async () => {
    userEvent.setup()
    nonDelayedhistoryGenerateAPIcallMock()
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    userEvent.click(promptButton)

    await waitFor(() => {
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
      expect(screen.getByText(/response from AI!/i)).toBeInTheDocument()
    })

    const startnewBtn = screen.getByRole('button', { name: /start a new chat button/i })

    await act(() => {
      fireEvent.click(startnewBtn)
    })
    await waitFor(() => {
      expect(screen.queryByTestId('chat-message-container')).not.toBeInTheDocument()
      expect(screen.getByText('Start chatting')).toBeInTheDocument()
    })
  })

  test('Should render existing chat messages', async () => {
    userEvent.setup()
    nonDelayedhistoryGenerateAPIcallMock()

    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockStateWithChatHistory }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    await act(() => {
      fireEvent.click(promptButton)
    })

    await waitFor(() => {
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
    })
  })

  test('Should handle historyUpdate API return ok as false', async () => {
    nonDelayedhistoryGenerateAPIcallMock()

    historyUpdateApi.mockResolvedValueOnce({ ok: false })
    const tempMockState = { ...mockStateWithChatHistory }

    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,

      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    await act(() => {
      fireEvent.click(promptButton)
    })

    await waitFor(async () => {
      expect(
        await screen.findByText(
          /An error occurred. Answers can't be saved at this time. If the problem persists, please contact the site administrator./i
        )
      ).toBeInTheDocument()
    })
  })

  test('Should handle historyUpdate API failure', async () => {
    userEvent.setup()
    nonDelayedhistoryGenerateAPIcallMock()

    historyUpdateApi.mockRejectedValueOnce(new Error('historyUpdate API Error'))
    const tempMockState = { ...mockStateWithChatHistory }

    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,

      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    await userEvent.click(promptButton)

    await waitFor(async () => {
      const mockError = new Error('historyUpdate API Error')
      expect(console.error).toHaveBeenCalledWith('Error: ', mockError)
    })
  })

  test('Should handled when selected chat item not exists in chat history', async () => {
    userEvent.setup()
    nonDelayedhistoryGenerateAPIcallMock()

    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockStateWithChatHistory }
    tempMockState.currentChat = {
      id: 'eaedb3b5-d21b-4d02-86c0-524e9b8cacb6',
      title: 'Summarize Alexander Harrington previous meetings',
      date: '2024-10-08T10:25:11.970412',
      messages: [
        {
          id: '55bf73d8-2a07-4709-a214-073aab7af3f0',
          role: 'user',
          date: '2024-10-08T10:25:13.314496',
          content: 'Summarize Alexander Harrington previous meetings'
        }
      ]
    }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const promptButton = screen.getByRole('button', { name: /prompt-button/i })

    await act(() => {
      fireEvent.click(promptButton)
    })

    await waitFor(() => {
      const mockError = 'Conversation not found.'
      expect(console.error).toHaveBeenCalledWith(mockError)
    })
  })

  test('Should handle other than (CosmosDBStatus.Working & CosmosDBStatus.NotConfigured) and ChatHistoryLoadingState.Fail', async () => {
    userEvent.setup()
    nonDelayedhistoryGenerateAPIcallMock()

    const tempMockState = { ...mockState }
    tempMockState.isCosmosDBAvailable = {
      ...tempMockState.isCosmosDBAvailable,
      status: CosmosDBStatus.NotWorking
    }
    tempMockState.chatHistoryLoadingState = ChatHistoryLoadingState.Fail
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)

    await waitFor(() => {
      expect(screen.getByText(/Chat history is not enabled/i)).toBeInTheDocument()
      const er = CosmosDBStatus.NotWorking + '. Please contact the site administrator.'
      expect(screen.getByText(er)).toBeInTheDocument()
    })
  })

  // re look into this
  test('Should able perform action(onSend) form Question input component', async () => {
    userEvent.setup()
    nonDelayedhistoryGenerateAPIcallMock()
    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockState }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const questionInputtButton = screen.getByRole('button', { name: /question-input/i })

    await act(async () => {
      await userEvent.click(questionInputtButton)
    })

    await waitFor(() => {
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
      expect(screen.getByText(/response from AI!/i)).toBeInTheDocument()
    })
  })

  test('Should able perform action(onSend) form Question input component with existing history item', async () => {
    userEvent.setup()
    historyGenerateAPIcallMock()
    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockStateWithChatHistory }
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const questionInputtButton = screen.getByRole('button', { name: /question-input/i })

    await act(async () => {
      await userEvent.click(questionInputtButton)
    })

    await waitFor(() => {
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
      expect(screen.getByText(/response from AI content!/i)).toBeInTheDocument()
    })
  })

  // For cosmosDB is false
  test('Should able perform action(onSend) form Question input component if consmosDB false', async () => {
    userEvent.setup()
    conversationApiCallMock()
    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockState }
    tempMockState.isCosmosDBAvailable.cosmosDB = false
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const questionInputtButton = screen.getByRole('button', { name: /question-input/i })

    await act(async () => {
      await userEvent.click(questionInputtButton)
    })

    await waitFor(async () => {
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
      expect(await screen.findByText(/response from AI!/i)).toBeInTheDocument()
    })
  })

  test('Should able perform action(onSend) form Question input component if consmosDB false', async () => {
    userEvent.setup()
    conversationApiCallMock('chat-item-selected')
    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockStateWithChatHistory }
    tempMockState.isCosmosDBAvailable.cosmosDB = false
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const questionInputtButton = screen.getByRole('button', { name: /question-input/i })

    await userEvent.click(questionInputtButton)

    await waitFor(async () => {
      expect(screen.getByTestId('chat-message-container')).toBeInTheDocument()
      //expect(await screen.findByText(/response from AI content!/i)).toBeInTheDocument();
    })
  })

  test('Should handle : If conversaton is not there/equal to the current selected chat', async () => {
    userEvent.setup()
    conversationApiCallMock()
    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockState }
    tempMockState.isCosmosDBAvailable.cosmosDB = false
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const questionInputtButton = screen.getByRole('button', { name: /question-dummy/i })

    await userEvent.click(questionInputtButton)

    await waitFor(async () => {
      expect(console.error).toHaveBeenCalledWith('Conversation not found.')
      expect(screen.queryByTestId('chat-message-container')).not.toBeInTheDocument()
    })
  })

  test('Should handle : if conversationApiCallMock API return error object L(221-223)', async () => {
    userEvent.setup()
    conversationApiCallMock('error-result')
    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockState }
    tempMockState.isCosmosDBAvailable.cosmosDB = false
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const questionInputtButton = screen.getByRole('button', { name: /question-input/i })

    await userEvent.click(questionInputtButton)

    await waitFor(async () => {
      expect(screen.getByText(/error API result/i)).toBeInTheDocument()
    })
  })

  test('Should handle : if conversationApiCallMock API return error string ', async () => {
    userEvent.setup()
    conversationApiCallMock('error-string-result')
    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockState }
    tempMockState.isCosmosDBAvailable.cosmosDB = false
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const questionInputtButton = screen.getByRole('button', { name: /question-input/i })

    await userEvent.click(questionInputtButton)

    await waitFor(async () => {
      expect(screen.getByText(/error API result/i)).toBeInTheDocument()
    })
  })

  test('Should handle : if conversationApiCallMock API return in-complete response L(233)', async () => {
    userEvent.setup()
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    conversationApiCallMock('incomplete-result')
    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockState }
    tempMockState.isCosmosDBAvailable.cosmosDB = false
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const questionInputtButton = screen.getByRole('button', { name: /question-input/i })

    await userEvent.click(questionInputtButton)

    await waitFor(async () => {
      expect(consoleLogSpy).toHaveBeenCalledWith('Incomplete message. Continuing...')
    })
    consoleLogSpy.mockRestore()
  })

  test('Should handle : if conversationApiCallMock API failed', async () => {
    userEvent.setup()
    mockCallConversationApi.mockRejectedValueOnce(new Error('API Error'))
    historyUpdateApi.mockResolvedValueOnce({ ok: true })
    const tempMockState = { ...mockState }
    tempMockState.isCosmosDBAvailable.cosmosDB = false
    tempMockState.frontendSettings = {
      ...tempMockState.frontendSettings,
      auth_enabled: false
    }
    renderWithContext(<Chat setIsVisible={setIsVisible} />, tempMockState)
    const questionInputtButton = screen.getByRole('button', { name: /question-input/i })

    await userEvent.click(questionInputtButton)

    await waitFor(async () => {
      expect(
        screen.getByText(
          /An error occurred. Please try again. If the problem persists, please contact the site administrator./i
        )
      ).toBeInTheDocument()
    })
  })
})
