import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Dialog } from '@fluentui/react'
import { getpbi, getUserInfo } from '../../api/api'
import { AppStateContext } from '../../state/AppProvider'
import Layout from './Layout'
import Cards from '../../components/Cards/Cards'
//import { renderWithContext } from '../../test/test.utils'
import { HistoryButton } from '../../components/common/Button'
import { CodeJsRectangle16Filled } from '@fluentui/react-icons'

// Create the Mocks

jest.mock('remark-gfm', () => () => {})
jest.mock('rehype-raw', () => () => {})
jest.mock('react-uuid', () => () => {})

const mockUsers = {
  ClientId: '1',
  ClientName: 'Client 1',
  NextMeeting: 'Test Meeting 1',
  NextMeetingTime: '10:00',
  AssetValue: 10000,
  LastMeeting: 'Last Meeting 1',
  ClientSummary: 'Summary for User One',
  chartUrl: ''
}

jest.mock('../../components/Cards/Cards', () => {
  return jest.fn((props: any) => (
    <div data-testid="user-card-mock" onClick={() => props.onCardClick(mockUsers)}>
      Mocked Card Component
    </div>
  ))
})

jest.mock('../chat/Chat', () => {
  const Chat = () => <div data-testid="Chat-component">Mocked Chat Component</div>
  return Chat
})

jest.mock('../../api/api', () => ({
  getpbi: jest.fn(),
  getUsers: jest.fn(),
  getUserInfo: jest.fn()
}))

const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(Promise.resolve())
}

const mockDispatch = jest.fn()

const renderComponent = (appState: any) => {
  return render(
    <MemoryRouter>
      <AppStateContext.Provider value={{ state: appState, dispatch: mockDispatch }}>
        <Layout />
      </AppStateContext.Provider>
    </MemoryRouter>
  )
}

describe('Layout Component', () => {
  beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true
    })
    global.fetch = mockDispatch
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  //-------//

  // Test--Start //

  test('renders layout with welcome message', async () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { cosmosDB: false, status: 'Available' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    await waitFor(() => {
      expect(screen.getByText(/Welcome Back, Test User/i)).toBeInTheDocument()
      expect(screen.getByText(/Welcome Back, Test User/i)).toBeVisible()
    })
  })

  test('fetches user info', async () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { cosmosDB: false, status: 'Available' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    expect(getpbi).toHaveBeenCalledTimes(1)
    expect(getUserInfo).toHaveBeenCalledTimes(1)
  })

  test('updates share label on window resize', async () => {
    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'Available' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    expect(screen.getByText('Share')).toBeInTheDocument()

    window.innerWidth = 400
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(screen.queryByText('Share')).toBeNull()
    })

    window.innerWidth = 480
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(screen.queryByText('Share')).not.toBeNull()
    })

    window.innerWidth = 600
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument()
    })
  })

  test('updates Hide chat history', async () => {
    const appState = {
      isChatHistoryOpen: true,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'Available' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    expect(screen.getByText('Hide chat history')).toBeInTheDocument()
  })

  test('check the website tile', async () => {
    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App title', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'Available' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    expect(screen.getByText('Test App title')).toBeVisible()
    expect(screen.getByText('Test App title')).not.toBe('{{ title }}')
    expect(screen.getByText('Test App title')).not.toBeNaN()
  })

  test('check the welcomeCard', async () => {
    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App title', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'Available' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    expect(screen.getByText('Select a client')).toBeVisible()
    expect(
      screen.getByText(
        'You can ask questions about their portfolio details and previous conversations or view their profile.'
      )
    ).toBeVisible()
  })

  test('check the Loader', async () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'Available' },
      isLoader: true,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    expect(screen.getByText('Please wait.....!')).toBeVisible()
  })

  test('copies the URL when Share button is clicked', async () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'Available' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    const shareButton = screen.getByText('Share')
    expect(shareButton).toBeInTheDocument()
    fireEvent.click(shareButton)

    const copyButton = await screen.findByRole('button', { name: /copy/i })
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(window.location.href)
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1)
    })
  })

  test('should log error when getpbi fails', async () => {
    ;(getpbi as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {})

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'Available' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    await waitFor(() => {
      expect(getpbi).toHaveBeenCalled()
    })

    const mockError = new Error('API Error')

    expect(console.error).toHaveBeenCalledWith('Error fetching PBI url:', mockError)

    consoleErrorMock.mockRestore()
  })

  test('should log error when getUderInfo fails', async () => {
    ;(getUserInfo as jest.Mock).mockRejectedValue(new Error())

    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {})

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'Available' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    await waitFor(() => {
      expect(getUserInfo).toHaveBeenCalled()
    })

    const mockError = new Error()

    expect(console.error).toHaveBeenCalledWith('Error fetching user info: ', mockError)

    consoleErrorMock.mockRestore()
  })

  test('handles card click and updates context with selected user', async () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'CosmosDB is configured and working' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    const userCard = screen.getByTestId('user-card-mock')

    await act(() => {
      fireEvent.click(userCard)
    })

    expect(screen.getByText(/Client 1/i)).toBeVisible()
  })

  test('test Dialog', async () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'CosmosDB is configured and working' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    const MockShare = screen.getAllByRole('button')[1]
    fireEvent.click(MockShare)

    const MockDilog = screen.getByLabelText('Close')

    await act(() => {
      fireEvent.click(MockDilog)
    })

    expect(MockDilog).not.toBeVisible()
  })

  test('test History button', async () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'CosmosDB is configured and working' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    const MockShare = screen.getByText('Show chat history')

    await act(() => {
      fireEvent.click(MockShare)
    })

    expect(MockShare).not.toHaveTextContent('Hide chat history')
  })

  test('test Copy button', async () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'CosmosDB is configured and working' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    const MockShare = screen.getAllByRole('button')[1]
    fireEvent.click(MockShare)

    const CopyShare = screen.getByLabelText('Copy')
    await act(() => {
      fireEvent.keyDown(CopyShare, { key: 'Enter' })
    })

    expect(CopyShare).not.toHaveTextContent('Copy')
  })

  test('test logo', () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'CosmosDB is configured and working' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    const img = screen.getByAltText('')

    expect(img).not.toHaveAttribute('src', 'test-logo.svg')
  })

  test('test getUserInfo', () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'nameinfo', val: 'Test User' }] }])

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'CosmosDB is configured and working' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    expect(screen.getByText(/Welcome Back,/i)).toBeInTheDocument()
    expect(screen.getByText(/Welcome Back,/i)).toBeVisible()
  })

  test('test Spinner', async () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])

    const appStatetrue = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'CosmosDB is configured and working' },
      isLoader: true,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appStatetrue)

    const spinner = screen.getByText('Please wait.....!')

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'CosmosDB is configured and working' },
      isLoader: undefined,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    expect(spinner).toBeVisible()
  })

  test('test Span', async () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])
    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'CosmosDB is configured and working' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }
    renderComponent(appState)
    const userCard = screen.getByTestId('user-card-mock')
    await act(() => {
      fireEvent.click(userCard)
    })

    expect(screen.getByText('Client 1')).toBeInTheDocument()
    expect(screen.getByText('Client 1')).not.toBeNull()
  })

  test('test Copy button Condication', () => {
    ;(getpbi as jest.Mock).mockResolvedValue('https://mock-pbi-url.com')
    ;(getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Test User' }] }])

    const appState = {
      isChatHistoryOpen: false,
      frontendSettings: {
        ui: { logo: 'test-logo.svg', title: 'Test App', show_share_button: true }
      },
      isCosmosDBAvailable: { status: 'CosmosDB is configured and working' },
      isLoader: false,
      chatHistoryLoadingState: 'idle',
      chatHistory: [],
      filteredChatHistory: [],
      currentChat: null,
      error: null,
      activeUserId: null
    }

    renderComponent(appState)

    const MockShare = screen.getAllByRole('button')[1]
    fireEvent.click(MockShare)

    const CopyShare = screen.getByLabelText('Copy')
    fireEvent.keyDown(CopyShare, { key: 'E' })

    expect(CopyShare).toHaveTextContent('Copy')
  })
})
