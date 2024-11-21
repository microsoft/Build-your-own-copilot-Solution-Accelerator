import React from 'react'
import { renderWithContext, screen, waitFor, fireEvent, act } from '../../test/test.utils'
import { ChatHistoryPanel } from './ChatHistoryPanel'
import { AppStateContext } from '../../state/AppProvider'
import { ChatHistoryLoadingState, CosmosDBStatus } from '../../api/models'
import userEvent from '@testing-library/user-event'
import { historyDeleteAll } from '../../api'

jest.mock('./ChatHistoryList', () => ({
  ChatHistoryList: () => <div>Mocked ChatHistoryPanel</div>
}))

// Mock Fluent UI components
jest.mock('@fluentui/react', () => ({
  ...jest.requireActual('@fluentui/react'),
  Spinner: () => <div>Loading...</div>
}))

jest.mock('../../api', () => ({
  historyDeleteAll: jest.fn()
}))

const mockDispatch = jest.fn()

describe('ChatHistoryPanel Component', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockAppState = {
    chatHistory: [{ id: 1, message: 'Test Message' }],
    chatHistoryLoadingState: ChatHistoryLoadingState.Success,
    isCosmosDBAvailable: { cosmosDB: true, status: CosmosDBStatus.Working }
  }

  it('renders the ChatHistoryPanel with chat history loaded', () => {
    renderWithContext(<ChatHistoryPanel isLoading={false} />, mockAppState)
    expect(screen.getByText('Chat history')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear all chat history/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide/i })).toBeInTheDocument()
  })

  it('renders a spinner when chat history is loading', async () => {
    const stateVal = {
      ...mockAppState,
      chatHistoryLoadingState: ChatHistoryLoadingState.Loading
    }
    renderWithContext(<ChatHistoryPanel isLoading={false} />, stateVal)
    await waitFor(() => {
      expect(screen.getByText('Loading chat history')).toBeInTheDocument()
    })
  })

  it('opens the clear all chat history dialog when the command button is clicked', async () => {
    userEvent.setup()
    renderWithContext(<ChatHistoryPanel isLoading={false} />, mockAppState)

    const moreButton = screen.getByRole('button', { name: /clear all chat history/i })
    fireEvent.click(moreButton)

    expect(screen.queryByText('Clear all chat history')).toBeInTheDocument()

    const clearAllItem = await screen.findByRole('menuitem')
    await act(() => {
      userEvent.click(clearAllItem)
    })
    await waitFor(() =>
      expect(screen.getByText(/are you sure you want to clear all chat history/i)).toBeInTheDocument()
    )
  })

  it('calls historyDeleteAll when the "Clear All" button is clicked in the dialog', async () => {
    userEvent.setup()

    const compState = {
      chatHistory: [{ id: 1, message: 'Test Message' }],
      chatHistoryLoadingState: ChatHistoryLoadingState.Success,
      isCosmosDBAvailable: { cosmosDB: true, status: CosmosDBStatus.Working }
    }

    ;(historyDeleteAll as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    renderWithContext(<ChatHistoryPanel isLoading={false} />, compState)

    const moreButton = screen.getByRole('button', { name: /clear all chat history/i })
    fireEvent.click(moreButton)

    //const clearAllItem = screen.getByText('Clear all chat history')
    const clearAllItem = await screen.findByRole('menuitem')
    await act(() => {
      userEvent.click(clearAllItem)
    })

    await waitFor(() =>
      expect(screen.getByText(/are you sure you want to clear all chat history/i)).toBeInTheDocument()
    )
    const clearAllButton = screen.getByRole('button', { name: /clear all/i })

    await act(async () => {
      await userEvent.click(clearAllButton)
    })

    await waitFor(() => expect(historyDeleteAll).toHaveBeenCalled())
    //await waitFor(() => expect(historyDeleteAll).toHaveBeenCalledTimes(1));

    //   await act(()=>{
    //   expect(jest.fn()).toHaveBeenCalledWith({ type: 'DELETE_CHAT_HISTORY' });
    //   });

    // Verify that the dialog is hidden
    await waitFor(() => {
      expect(screen.queryByText('Are you sure you want to clear all chat history?')).not.toBeInTheDocument()
    })
  })

  it('hides the dialog when cancel or close is clicked', async () => {
    userEvent.setup()

    const compState = {
      chatHistory: [{ id: 1, message: 'Test Message' }],
      chatHistoryLoadingState: ChatHistoryLoadingState.Success,
      isCosmosDBAvailable: { cosmosDB: true, status: CosmosDBStatus.Working }
    }

    renderWithContext(<ChatHistoryPanel isLoading={false} />, compState)

    const moreButton = screen.getByRole('button', { name: /clear all chat history/i })
    fireEvent.click(moreButton)

    const clearAllItem = await screen.findByRole('menuitem')
    await act(() => {
      userEvent.click(clearAllItem)
    })

    await waitFor(() =>
      expect(screen.getByText(/are you sure you want to clear all chat history/i)).toBeInTheDocument()
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })

    await act(() => {
      userEvent.click(cancelButton)
    })

    await waitFor(() =>
      expect(screen.queryByText(/are you sure you want to clear all chat history/i)).not.toBeInTheDocument()
    )
  })

  test('handles API failure correctly', async () => {
    // Mock historyDeleteAll to return a failed response
    ;(historyDeleteAll as jest.Mock).mockResolvedValueOnce({ ok: false })

    userEvent.setup()

    const compState = {
      chatHistory: [{ id: 1, message: 'Test Message' }],
      chatHistoryLoadingState: ChatHistoryLoadingState.Success,
      isCosmosDBAvailable: { cosmosDB: true, status: CosmosDBStatus.Working }
    }

    renderWithContext(<ChatHistoryPanel isLoading={false} />, compState)
    const moreButton = screen.getByRole('button', { name: /clear all chat history/i })
    fireEvent.click(moreButton)

    //const clearAllItem = screen.getByText('Clear all chat history')
    const clearAllItem = await screen.findByRole('menuitem')
    await act(() => {
      userEvent.click(clearAllItem)
    })

    await waitFor(() =>
      expect(screen.getByText(/are you sure you want to clear all chat history/i)).toBeInTheDocument()
    )
    const clearAllButton = screen.getByRole('button', { name: /clear all/i })

    await act(async () => {
      await userEvent.click(clearAllButton)
    })

    // Assert that error state is set
    await waitFor(async () => {
      expect(await screen.findByText('Error deleting all of chat history')).toBeInTheDocument()
      //expect(mockDispatch).not.toHaveBeenCalled(); // Ensure dispatch was not called on failure
    })
  })

  it('handleHistoryClick', () => {
    const stateVal = {
      ...mockAppState,
      chatHistoryLoadingState: ChatHistoryLoadingState.Success,
      isCosmosDBAvailable: { cosmosDB: false, status: '' }
    }
    renderWithContext(<ChatHistoryPanel isLoading={false} />, stateVal)

    const hideBtn = screen.getByRole('button', { name: /hide button/i })
    fireEvent.click(hideBtn)

    //expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_CHAT_HISTORY' });
  })

  it('displays an error message when chat history fails to load', async () => {
    const errorState = {
      ...mockAppState,
      chatHistoryLoadingState: ChatHistoryLoadingState.Fail,
      isCosmosDBAvailable: { cosmosDB: true, status: '' } // Falsy status to trigger the error message
    }

    renderWithContext(<ChatHistoryPanel isLoading={false} />, errorState)

    await waitFor(() => {
      expect(screen.getByText('Error loading chat history')).toBeInTheDocument()
    })
  })

  //   it('resets clearingError after timeout', async () => {
  //     ;(historyDeleteAll as jest.Mock).mockResolvedValueOnce({ ok: false })

  //     userEvent.setup()

  //     renderWithContext(<ChatHistoryPanel isLoading={false} />, mockAppState)

  //     const moreButton = screen.getByRole('button', { name: /clear all chat history/i })
  //     fireEvent.click(moreButton)

  //     const clearAllItem = await screen.findByRole('menuitem')
  //     await act(() => {
  //       userEvent.click(clearAllItem)
  //     })

  //     await waitFor(() =>
  //       expect(screen.getByText(/are you sure you want to clear all chat history/i)).toBeInTheDocument()
  //     )

  //     const clearAllButton = screen.getByRole('button', { name: /clear all/i })
  //     await act(async () => {
  //       userEvent.click(clearAllButton)
  //     })

  //     await waitFor(() => expect(screen.getByText('Error deleting all of chat history')).toBeInTheDocument())

  //     act(() => {
  //       jest.advanceTimersByTime(2000)
  //     })

  //     await waitFor(() => {
  //       expect(screen.queryByText('Error deleting all of chat history')).not.toBeInTheDocument()
  //     })
  //   })
})
