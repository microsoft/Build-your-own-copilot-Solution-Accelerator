import Cards from './Cards'
import { renderWithContext, screen, waitFor, fireEvent, act } from '../../test/test.utils'
import { getUsers } from '../../api'
import userEvent from '@testing-library/user-event'

// Mock API
jest.mock('../../api/api', () => ({
  getUsers: jest.fn()
}))

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.clearAllMocks()
})

const mockDispatch = jest.fn()
const mockOnCardClick = jest.fn()

jest.mock('../UserCard/UserCard', () => ({
  UserCard: (props: any) => (
    <div data-testid="user-card-mock" onClick={() => props.onCardClick(props)}>
      {props.ClientName}
      <span>{props.isSelected ? 'Selected' : 'not selected'}</span>
    </div>
  )
}))

const mockUsers = [
  {
    ClientId: '1',
    ClientName: 'Client 1',
    NextMeeting: 'Test Meeting 1',
    NextMeetingTime: '10:00',
    AssetValue: 10000,
    LastMeeting: 'Last Meeting 1',
    ClientSummary: 'Summary for User One',
    chartUrl: ''
  }
]

const multipleUsers = [
  {
    ClientId: '1',
    ClientName: 'Client 1',
    NextMeeting: 'Test Meeting 1',
    NextMeetingTime: '10:00 AM',
    AssetValue: 10000,
    LastMeeting: 'Last Meeting 1',
    ClientSummary: 'Summary for User One',
    chartUrl: ''
  },
  {
    ClientId: '2',
    ClientName: 'Client 2',
    NextMeeting: 'Test Meeting 2',
    NextMeetingTime: '2:00 PM',
    AssetValue: 20000,
    LastMeeting: 'Last Meeting 2',
    ClientSummary: 'Summary for User Two',
    chartUrl: ''
  }
]

describe('Card Component', () => {
  beforeEach(() => {
    global.fetch = mockDispatch
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.clearAllMocks()
    //(console.error as jest.Mock).mockRestore();
  })

  test('displays loading message while fetching users', async () => {
    ;(getUsers as jest.Mock).mockResolvedValueOnce([])

    renderWithContext(<Cards onCardClick={mockDispatch} />)

    expect(screen.queryByText('Loading...')).toBeInTheDocument()

    await waitFor(() => expect(getUsers).toHaveBeenCalled())
  })

  test('displays no meetings message when there are no users', async () => {
    ;(getUsers as jest.Mock).mockResolvedValueOnce([])

    renderWithContext(<Cards onCardClick={mockDispatch} />)

    await waitFor(() => expect(getUsers).toHaveBeenCalled())

    expect(screen.getByText('No meetings have been arranged')).toBeInTheDocument()
  })

  test('displays user cards when users are fetched', async () => {
    ;(getUsers as jest.Mock).mockResolvedValueOnce(mockUsers)

    renderWithContext(<Cards onCardClick={mockDispatch} />)

    await waitFor(() => expect(getUsers).toHaveBeenCalled())

    expect(screen.getByText('Client 1')).toBeInTheDocument()
  })

  test('handles API failure and stops loading', async () => {
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {})

    ;(getUsers as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

    renderWithContext(<Cards onCardClick={mockDispatch} />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()

    await waitFor(() => {
      expect(getUsers).toHaveBeenCalled()
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const mockError = new Error('API Error')

    expect(console.error).toHaveBeenCalledWith('Error fetching users:', mockError)

    consoleErrorMock.mockRestore()
  })

  test('handles card click and updates context with selected user', async () => {
    ;(getUsers as jest.Mock).mockResolvedValueOnce(mockUsers)

    const mockOnCardClick = mockDispatch

    renderWithContext(<Cards onCardClick={mockOnCardClick} />)

    await waitFor(() => expect(getUsers).toHaveBeenCalled())

    const userCard = screen.getByTestId('user-card-mock')

    await act(() => {
      fireEvent.click(userCard)
    })
  })

  test('display "No future meetings have been arranged" when there is only one user', async () => {
    ;(getUsers as jest.Mock).mockResolvedValueOnce(mockUsers)

    renderWithContext(<Cards onCardClick={mockDispatch} />)

    await waitFor(() => expect(getUsers).toHaveBeenCalled())

    expect(screen.getByText('No future meetings have been arranged')).toBeInTheDocument()
  })

  test('renders future meetings when there are multiple users', async () => {
    ;(getUsers as jest.Mock).mockResolvedValueOnce(multipleUsers)

    renderWithContext(<Cards onCardClick={mockDispatch} />)

    await waitFor(() => expect(getUsers).toHaveBeenCalled())

    expect(screen.getByText('Client 2')).toBeInTheDocument()
    expect(screen.queryByText('No future meetings have been arranged')).not.toBeInTheDocument()
  })

  test('logs error when user does not have a ClientId and ClientName', async () => {
    ;(getUsers as jest.Mock).mockResolvedValueOnce([
      {
        ClientId: null,
        ClientName: '',
        NextMeeting: 'Test Meeting 1',
        NextMeetingTime: '10:00 AM',
        AssetValue: 10000,
        LastMeeting: 'Last Meeting 1',
        ClientSummary: 'Summary for User One',
        chartUrl: ''
      }
    ])

    renderWithContext(<Cards onCardClick={mockDispatch} />, {
      context: {
        AppStateContext: { dispatch: mockDispatch }
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('user-card-mock')).toBeInTheDocument()
    })

    const userCard = screen.getByTestId('user-card-mock')
    fireEvent.click(userCard)

    expect(console.error).toHaveBeenCalledWith(
      'User does not have a ClientId and clientName:',
      expect.objectContaining({
        ClientId: null,
        ClientName: ''
      })
    )
  })

})
