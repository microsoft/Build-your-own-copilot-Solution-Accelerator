import React from 'react'
import { render, fireEvent, waitFor, screen, getByPlaceholderText } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ResearchTopicCard } from './ResearchTopicCard'
import { type AppState, AppStateContext } from '../../state/AppProvider'
import { documentSectionGenerate } from '../../api'
import { SidebarOptions } from '../SidebarView/SidebarView'
import { SystemErrMessage } from './Card'

// Mock the API call
jest.mock('../../api', () => ({
  documentSectionGenerate: jest.fn()
}))

const mockDispatch = jest.fn()
export const mockState: AppState = {
  researchTopic: 'Sample Topic',
  documentSections: [{ title: 'Section 1', content: '', metaPrompt: '' }],
  currentChat: null,
  articlesChat: { id: '1', title: 'Chat 1', messages: [], date: '' },
  grantsChat: { id: '1', title: 'Chat 1', messages: [], date: '' },
  frontendSettings: {},
  favoritedCitations: [],
  isSidebarExpanded: false,
  isChatViewOpen: false,
  sidebarSelection: SidebarOptions.Article,
  showInitialChatMessage: false
}

describe('ResearchTopicCard component', () => {
  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <ResearchTopicCard />
      </AppStateContext.Provider>
    )

    expect(getByText('Topic')).toBeInTheDocument()
    expect(getByText('What subject matter does your proposal cover?')).toBeInTheDocument()
    expect(getByPlaceholderText('Type a new topic...')).toBeInTheDocument()
  })

  it('updates research topic on change', () => {
    const { getByPlaceholderText } = render(
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <ResearchTopicCard />
      </AppStateContext.Provider>
    )

    const textarea = getByPlaceholderText('Type a new topic...')
    fireEvent.change(textarea, { target: { value: 'New Topic' } })

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_RESEARCH_TOPIC',
      payload: 'New Topic'
    })
  })

  it('calls generate section content on button click', async () => {
    (documentSectionGenerate as jest.Mock).mockResolvedValue({
      json: async () => ({ content: 'Generated Content' }),
      status: 200
    })

    const { getByText } = render(
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <ResearchTopicCard />
      </AppStateContext.Provider>
    )

    const button = getByText('Generate')
    fireEvent.click(button)

    await waitFor(() => {
      expect(documentSectionGenerate).toHaveBeenCalledWith('Sample Topic', expect.any(Object))
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
        payload: expect.any(Array)
      })
    })
  })

  it('renders without crashing', () => {
    render(
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <ResearchTopicCard />
      </AppStateContext.Provider>
    )
    expect(screen.getByText('What subject matter does your proposal cover?')).toBeInTheDocument()
  })

  test('content is empty', async () => {
    (documentSectionGenerate as jest.Mock).mockResolvedValue({
      body: {},
      json: async () => ({ content: '' }),
      status: 200
    })

    render(
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <ResearchTopicCard />
      </AppStateContext.Provider>
    )

    fireEvent.click(screen.getByText('Generate'))

    const btnGenarate = await screen.findByTestId('btngenerate')
    expect(btnGenarate).toBeInTheDocument()
  })

  test('content is not empty', async () => {
    (documentSectionGenerate as jest.Mock).mockResolvedValue({
      body: {},
      json: async () => ({ content: 'Generated Content' }),
      status: 200
    })

    render(
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <ResearchTopicCard />
      </AppStateContext.Provider>
    )

    fireEvent.click(screen.getByText('Generate'))

    const btnGenarate = await screen.findByTestId('btngenerate')
    expect(btnGenarate).toBeInTheDocument()
  })
})
