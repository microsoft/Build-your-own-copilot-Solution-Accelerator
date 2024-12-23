import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Card } from './Card'
import { type AppState, AppStateContext } from '../../state/AppProvider'
import { documentSectionGenerate } from '../../api'
import { SidebarOptions } from '../SidebarView/SidebarView'

jest.mock('../../api')

const mockDispatch = jest.fn()

export const mockState: AppState = {
  documentSections: [
    { title: 'Section 1', content: 'Initial content', metaPrompt: '' }
  ],
  researchTopic: 'Test Topic',
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
const renderWithContext = (component: any) => {
  return render(
    <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
      {component}
    </AppStateContext.Provider>
  )
}

describe('Card Component', () => {
  test('renders without crashing', () => {
    renderWithContext(<Card index={0} />)
    expect(screen.getByText('Section 1')).toBeInTheDocument()
  })

  test('initial state is correct', () => {
    renderWithContext(<Card index={0} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // expect(screen.getByText('Regenerate')).toBeDisabled()
  })

  test('opens and closes popover', async () => {
    renderWithContext(<Card index={0} />)
    fireEvent.click(screen.getByText('Regenerate'))
    expect(await screen.findByTestId('popupsummary')).toBeInTheDocument()
    const dismissbtn = await screen.findByTestId('dismiss')
    fireEvent.click(dismissbtn)
    expect(screen.queryByTestId('popupsummary')).not.toBeInTheDocument()
  })

  test('handles generate click', async () => {
    (documentSectionGenerate as jest.Mock).mockResolvedValue({
      body: {},
      json: async () => ({ content: 'Generated content' }),
      status: 200
    })
    renderWithContext(<Card index={0} />)
    fireEvent.click(screen.getByText('Regenerate'))
    fireEvent.click(screen.getByText('Generate'))

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
        payload: [{ title: 'Section 1', content: 'Generated content', metaPrompt: '' }]
      })
    })
  })

  test('section is empty', async () => {
    (documentSectionGenerate as jest.Mock).mockResolvedValue({
      body: {},
      json: async () => ({ content: 'Generated content' }),
      status: 200
    })
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const documentSectionEmpty = { ...mockState, documentSections: [] }
    render(
      <AppStateContext.Provider value={{ state: documentSectionEmpty, dispatch: mockDispatch }}>
        <Card index={0} />
      </AppStateContext.Provider>
    )

    fireEvent.click(screen.getByText('Regenerate'))
    fireEvent.click(screen.getByText('Generate'))
    expect(consoleErrorSpy).toHaveBeenCalledWith('Section information is undefined.')
  })

  test('handles error during generate click', async () => {
    (documentSectionGenerate as jest.Mock).mockResolvedValue({
      body: {},
      status: 400
    })

    renderWithContext(<Card index={0} />)
    fireEvent.click(screen.getByText('Regenerate'))
    fireEvent.click(screen.getByText('Generate'))

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
        payload: [{ title: 'Section 1', content: 'I am sorry, I don’t have this information in the knowledge repository. Please ask another question.', metaPrompt: '' }]
      })
    })
  })

  test('handles content change', async () => {
    renderWithContext(<Card index={0} />)
    const editableContainer = await screen.findByTestId('editable_container')
    fireEvent.blur(editableContainer, { target: { textContent: 'Updated content' } })

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
      payload: [{ title: 'Section 1', content: 'Updated content', metaPrompt: '' }]
    })
  })

  test('empty space', async () => {
    (documentSectionGenerate as jest.Mock).mockResolvedValue({
      body: {},
      json: async () => ({ content: 'Generated content' }),
      status: 200
    })
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const documentSectionEmpty = { ...mockState, documentSections: null }
    render(
      <AppStateContext.Provider value={{ state: documentSectionEmpty, dispatch: mockDispatch }}>
        <Card index={0} />
      </AppStateContext.Provider>
    )

    fireEvent.click(screen.getByText('Regenerate'))
    fireEvent.click(screen.getByText('Generate'))
    expect(consoleErrorSpy).toHaveBeenCalledWith('Section information is undefined.')
  })

  test('handles content change onblur textcontent emty', async () => {
    renderWithContext(<Card index={0} />)
    const editableContainer = await screen.findByTestId('editable_container')
    fireEvent.blur(editableContainer, { target: { textContent: '' } })

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
      payload: [{ title: 'Section 1', content: '', metaPrompt: '' }]
    })
  })
})
