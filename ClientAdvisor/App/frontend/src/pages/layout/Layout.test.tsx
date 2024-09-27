import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { getpbi, getUserInfo } from '../../api/api'
import { AppStateContext } from '../../state/AppProvider'
import Layout from './Layout'

import Chat from '../chat/Chat';
import Cards from '../../components/Cards/Cards'

// Mocking the components
jest.mock('remark-gfm', () => () => {})
jest.mock('rehype-raw', () => () => {})
jest.mock('react-uuid', () => () => {})

//jest.mock('../../components/Cards/Cards', () => <div>Mock Cards</div>)

// jest.mock('../../components/Cards/Cards', () => {
//   const Cards = () => (
//     <div data-testid='note-card-component'>Card Component</div>
//   );

//   return Cards;
// });

// jest.mock('../../components/ChatHistory/ChatHistoryPanel', () => ({
//   ChatHistoryPanel: (props: any) => <div>Mock ChatHistoryPanel</div>
// }))
// jest.mock('../../components/Spinner/SpinnerComponent', () => ({
//   SpinnerComponent: (props: any) => <div>Mock Spinner</div>
// }))
//jest.mock('../chat/Chat', () => () => <div>Mocked Chat Component</div>);

jest.mock('../../components/Cards/Cards');
//jest.mock('../chat/Chat');


jest.mock('../chat/Chat', () => {
  const Chat = () => (
    <div data-testid='note-list-component'>Mocked Chat Component</div>
  );
  return Chat;
});
// jest.mock('../../components/PowerBIChart/PowerBIChart', () => ({
//   PowerBIChart: (props: any) => <div>Mock PowerBIChart</div>
// }))

// Mock API
jest.mock('../../api/api', () => ({
  getpbi: jest.fn(),
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
  })
  afterEach(() => {
    jest.clearAllMocks()
  })

  test('renders layout with welcome message and fetches user info', async () => {
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

    await waitFor(() => {
      expect(screen.getByText(/Welcome Back, Test User/i)).toBeInTheDocument()
    })

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

    window.innerWidth = 600
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument()
    })
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

    window.innerWidth = 600
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument()
    })
  })
    
})
