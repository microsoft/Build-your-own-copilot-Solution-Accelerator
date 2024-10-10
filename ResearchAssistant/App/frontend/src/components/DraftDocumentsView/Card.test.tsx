/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/explicit-function-return-type */
// // Card.test.tsx
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
 
// Card.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Card } from './Card'
import { type Action, AppStateContext } from '../../state/AppProvider'
import { type ReactNode } from 'react'
import { type JSX } from 'react/jsx-runtime'
import { documentSectionGenerate } from '../../api' // Assuming this is the correct import
 
jest.mock('../../api') // Mock the API module
 
const mockDispatch = jest.fn()
const mockState = {
  researchTopic: 'Test Topic',
  documentSections: [
    { title: 'Test Section', content: 'Initial Content', metaPrompt: '' }
  ],
  currentChat: null,
  articlesChat: null,
  grantsChat: null,
  frontendSettings: {},
  user: { name: 'Test User' },
  sidebarSelection: null,
  showInitialChatMessage: false,
  favoritedCitations: [],
  isSidebarExpanded: false,
  isChatViewOpen: false
}
 
const renderWithContext = (component: ReactNode) => {
  return render(
    <AppStateContext.Provider value={{ state: mockState, dispatch: mockDispatch }}>
      {component}
    </AppStateContext.Provider>
  )
}
 
describe('Card Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
 
  test('renders the card with correct title and content', () => {
    renderWithContext(<Card index={0} />)
    expect(screen.getByText('Test Section')).toBeInTheDocument()
    expect(screen.getByText('Initial Content')).toBeInTheDocument()
    expect(screen.getByText('AI-generated content may be incorrect')).toBeInTheDocument()
  })
 
  //   test('updates section content and research topic on contenteditable change', async () => {
  //     renderWithContext(<Card index={0} />)
  //     const contentEditableParagraph = screen.getByText('Initial Content').closest('p')
 
  //     expect(contentEditableParagraph).toBeInTheDocument()
 
  //     fireEvent.input(contentEditableParagraph, { target: { innerText: 'Updated Content' } })
  //     fireEvent.blur(contentEditableParagraph)
 
  //     await waitFor(() => {
  //       expect(mockDispatch).toHaveBeenCalled()
  //       expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
  //         type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
  //         payload: expect.arrayContaining([
  //           expect.objectContaining({
  //             title: 'Test Section',
  //             content: 'Updated Content'
  //           })
  //         ])
  //       }))
  //     })
  //   })
 
  //   test('handles the regenerate button click and updates content', async () => {
  //     // Set up the mock to return the expected response
  //     (documentSectionGenerate as jest.Mock).mockResolvedValueOnce({
  //       json: async () => ({ content: 'Generated Content' }),
  //       status: 200
  //     })
 
  //     renderWithContext(<Card index={0} />)
  //     const button = screen.getByRole('button', { name: /Regenerate/i })
  //     fireEvent.click(button)
 
  //     // Wait for the API call to be made
  //     await waitFor(() => {
  //       screen.debug()
  //       expect(documentSectionGenerate).toHaveBeenCalledWith('Test Topic', {
  //         title: 'Test Section',
  //         metaPrompt: '',
  //         content: 'Initial Content'
  //       })
  //     })
 
  //     // Optionally, check if the dispatch call was made correctly
  //     await waitFor(() => {
  //       expect(mockDispatch).toHaveBeenCalledWith({
  //         type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
  //         payload: [{ title: 'Test Section', content: 'Generated Content', metaPrompt: '' }]
  //       })
  //     })
  //   })
 
  //   test('handles error response on regenerate button click', async () => {
  //     (documentSectionGenerate as jest.Mock).mockResolvedValueOnce({
  //       status: 400
  //     })
 
  //     renderWithContext(<Card index={0} />)
  //     const button = screen.getByRole('button', { name: /Regenerate/i })
  //     fireEvent.click(button)
 
  //     await waitFor(() => {
  //       expect(documentSectionGenerate).toHaveBeenCalled()
  //       expect(mockDispatch).toHaveBeenCalledWith({
  //         type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
  //         payload: [{
  //           title: 'Test Section',
  //           content: 'I am sorry, I don’t have this information in the knowledge repository. Please ask another question.',
  //           metaPrompt: ''
  //         }]
  //       })
  //     })
  //   })
 
  //   test('displays loading state when regenerating content', async () => {
  //     (documentSectionGenerate as jest.Mock).mockResolvedValueOnce({
  //       json: async () => ({ content: 'Generated Content' }),
  //       status: 200
  //     })
 
  //     renderWithContext(<Card index={0} />)
  //     const button = screen.getByRole('button', { name: /Regenerate/i })
  //     fireEvent.click(button)
 
  //     expect(screen.getByText('Working on it...')).toBeInTheDocument()
 
  //     await waitFor(() => {
  //       expect(screen.queryByText('Working on it...')).not.toBeInTheDocument()
  //     })
  //   })
 
  //   test('toggles popover open state', () => {
  //     renderWithContext(<Card index={0} />)
  //     const button = screen.getByRole('button', { name: /Regenerate/i })
 
  //     fireEvent.click(button)
  //     expect(screen.getByText('Regenerate Test Section')).toBeInTheDocument()
 
  //     const dismissButton = screen.getByRole('button', { name: /Dismiss/i })
  //     fireEvent.click(dismissButton)
  //     expect(screen.queryByText('Regenerate Test Section')).not.toBeInTheDocument()
  //   })
 
  //   test('updates metaPrompt on textarea change', async () => {
  //     renderWithContext(<Card index={0} />)
  //     const textarea = screen.getByRole('textbox') // Assuming the textarea has a role of textbox
 
  //     fireEvent.change(textarea, { target: { value: 'New Meta Prompt' } })
 
  //     expect(mockDispatch).toHaveBeenCalledWith({
  //       type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
  //       payload: [{ title: 'Test Section', content: 'Initial Content', metaPrompt: 'New Meta Prompt' }]
  //     })
  //   })
 
  //   test('handles the regenerate button click and updates content', async () => {
  //     (documentSectionGenerate as jest.Mock).mockResolvedValueOnce({
  //       json: async () => ({ content: 'Generated Content' }),
  //       status: 200
  //     })
 
  //     renderWithContext(<Card index={0} />)
  //     const button = screen.getByRole('button', { name: /Regenerate/i })
  //     fireEvent.click(button)
 
  //     await waitFor(() => {
  //       expect(documentSectionGenerate).toHaveBeenCalledWith('Test Topic', {
  //         title: 'Test Section',
  //         metaPrompt: '',
  //         content: 'Initial Content'
  //       })
 
  //       expect(mockDispatch).toHaveBeenCalledWith({
  //         type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
  //         payload: [{ title: 'Test Section', content: 'Generated Content', metaPrompt: '' }]
  //       })
  //     })
  //   })
 
  //   test('handles error response on regenerate button click', async () => {
  //     (documentSectionGenerate as jest.Mock).mockResolvedValueOnce({
  //       status: 400
  //     })
 
  //     renderWithContext(<Card index={0} />)
  //     const button = screen.getByRole('button', { name: /Regenerate/i })
  //     fireEvent.click(button)
 
  //     await waitFor(() => {
  //       expect(documentSectionGenerate).toHaveBeenCalled()
  //       expect(mockDispatch).toHaveBeenCalledWith({
  //         type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
  //         payload: [{
  //           title: 'Test Section',
  //           content: 'I am sorry, I don’t have this information in the knowledge repository. Please ask another question.',
  //           metaPrompt: ''
  //         }]
  //       })
  //     })
  //   })
 
  //   test('displays loading state when regenerating content', async () => {
  //     (documentSectionGenerate as jest.Mock).mockResolvedValueOnce({
  //       json: async () => ({ content: 'Generated Content' }),
  //       status: 200
  //     })
 
  //     renderWithContext(<Card index={0} />)
  //     const button = screen.getByRole('button', { name: /Regenerate/i })
  //     fireEvent.click(button)
 
  //     expect(screen.getByText('Working on it...')).toBeInTheDocument()
 
  //     await waitFor(() => {
  //       expect(screen.queryByText('Working on it...')).not.toBeInTheDocument()
  //     })
  //   })
 
  //   test('toggles popover open state', () => {
  //     renderWithContext(<Card index={0} />)
  //     const button = screen.getByRole('button', { name: /Regenerate/i })
 
  //     fireEvent.click(button)
  //     expect(screen.getByText('Regenerate Test Section')).toBeInTheDocument()
 
  //     const dismissButton = screen.getByRole('button', { name: /Dismiss/i })
  //     fireEvent.click(dismissButton)
  //     expect(screen.queryByText('Regenerate Test Section')).not.toBeInTheDocument()
  //   })
 
  //   test('updates metaPrompt on textarea change', () => {
  //     renderWithContext(<Card index={0} />)
  //     const textarea = screen.getByRole('textbox') // Assuming the textarea has a role of textbox
 
  //     fireEvent.change(textarea, { target: { value: 'New Meta Prompt' } })
 
//     expect(mockDispatch).toHaveBeenCalledWith({
//       type: 'UPDATE_DRAFT_DOCUMENTS_SECTIONS',
//       payload: [{ title: 'Test Section', content: 'Initial Content', metaPrompt: 'New Meta Prompt' }]
//     })
//   })
})