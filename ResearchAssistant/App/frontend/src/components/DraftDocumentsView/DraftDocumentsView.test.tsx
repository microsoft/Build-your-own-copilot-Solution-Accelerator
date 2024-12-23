// DraftDocumentsView.test.tsx
import React from 'react'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DraftDocumentsView } from './DraftDocumentsView'
import { AppStateContext } from '../../state/AppProvider'
import { getUserInfo } from '../../api'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import { SidebarOptions } from '../SidebarView/SidebarView'

// Mock the child components
jest.mock('./Card', () => ({
  Card: () => <div>Mocked Card</div>
}))
jest.mock('./ResearchTopicCard', () => ({
  ResearchTopicCard: () => <div>Mocked ResearchTopicCard</div>
}))

// Mock the API calls and external libraries
jest.mock('../../api', () => ({
  getUserInfo: jest.fn().mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'Fetched Name' }] }]),
  documentSectionGenerate: jest.fn()
}))
jest.mock('file-saver', () => ({
  saveAs: jest.fn()
}))
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    text: jest.fn(),
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    setTextColor: jest.fn(),
    line: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
    setLineWidth: jest.fn(),
    getStringUnitWidth: jest.fn().mockReturnValue(50), // Mock getTextWidth
    splitTextToSize: jest.fn((text) => [text]),
    internal: {
      pageSize: {
        getWidth: jest.fn().mockReturnValue(210),
        height: 297
      }
    }
  }))
})

const mockDispatch = jest.fn()
const mockState = {
  researchTopic: 'Sample Topic',
  documentSections: [{ title: 'Section 1', content: 'Content of section 1', metaPrompt: '' }],
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

describe('DraftDocumentsView component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <DraftDocumentsView />
      </AppStateContext.Provider>
    )

    expect(getByText('Draft grant proposal')).toBeInTheDocument()
    expect(getByText('Mocked ResearchTopicCard')).toBeInTheDocument()
    expect(getByPlaceholderText('Contoso')).toBeInTheDocument()
    expect(getByPlaceholderText('Name')).toBeInTheDocument()
    expect(getByPlaceholderText('FOA ID')).toBeInTheDocument()
    expect(getByPlaceholderText('FOA Title')).toBeInTheDocument()
    expect(getByPlaceholderText('Topic')).toBeInTheDocument()
    expect(getByPlaceholderText('Signature')).toBeInTheDocument()
    expect(getByPlaceholderText('Additional Signature')).toBeInTheDocument()
    expect(getByText('Mocked Card')).toBeInTheDocument()
  })

  it('updates state on input change', () => {
    const { getByPlaceholderText } = render(
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <DraftDocumentsView />
      </AppStateContext.Provider>
    )

    fireEvent.change(getByPlaceholderText('Contoso'), { target: { value: 'New Company' } })
    fireEvent.change(getByPlaceholderText('Name'), { target: { value: 'New Name' } })
    fireEvent.change(getByPlaceholderText('FOA ID'), { target: { value: 'New FOA ID' } })
    fireEvent.change(getByPlaceholderText('FOA Title'), { target: { value: 'New FOA Title' } })
    fireEvent.change(getByPlaceholderText('Topic'), { target: { value: 'New Topic' } })
    fireEvent.change(getByPlaceholderText('Signature'), { target: { value: 'New Signature' } })
    fireEvent.change(getByPlaceholderText('Additional Signature'), { target: { value: 'New Additional Signature' } })

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'UPDATE_RESEARCH_TOPIC', payload: 'New Topic' })
  })

  it('opens export popup on button click', () => {
    const { getByRole, getByText } = render(
        <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
          <DraftDocumentsView />
        </AppStateContext.Provider>
    )

    fireEvent.click(getByRole('button', { name: /export/i }))

    expect(getByText('Create Word Doc')).toBeInTheDocument()
    expect(getByText('Create PDF')).toBeInTheDocument()
  })

  it('creates and saves a Word document', async () => {
    const { getByRole, getByText } = render(
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <DraftDocumentsView />
      </AppStateContext.Provider>
    )

    fireEvent.click(getByRole('button', { name: /export/i }))
    fireEvent.click(getByText('Create Word Doc'))

    await waitFor(() => {
      expect(saveAs).toHaveBeenCalled()
    })
  })

  it('creates and saves a PDF document', async () => {
    const { getByRole } = render(
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <DraftDocumentsView />
      </AppStateContext.Provider>
    )
    fireEvent.click(getByRole('button', { name: /export/i }))
    fireEvent.click(getByRole('button', { name: /Create PDF/i }))

    await waitFor(() => {
      expect(jsPDF).toHaveBeenCalled()
    })
  })

  it('fetches user info on mount', async () => {
    render(
      <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
        <DraftDocumentsView />
      </AppStateContext.Provider>
    )

    await waitFor(() => {
      expect(getUserInfo).toHaveBeenCalled()
    })
  })
})
