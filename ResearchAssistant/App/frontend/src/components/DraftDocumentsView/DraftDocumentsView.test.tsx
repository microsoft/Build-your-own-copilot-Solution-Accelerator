/* eslint-disable react/prop-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-sequences */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { type AppState, AppStateContext } from '../../state/AppProvider'
import { DraftDocumentsView } from './DraftDocumentsView' // Ensure this matches your named export
import * as api from '../../api'
import { saveAs } from 'file-saver'
import { type SidebarOptions } from '../SidebarView/SidebarView'
import React from 'react'
import { debug } from 'console'
 
// Mock the Card component
jest.mock('./Card', () => ({
  ResearchTopicCard: jest.fn(() => <div>Mocked ResearchTopicCard</div>),
  documentSectionPrompt: jest.fn(() => <div>Mocked documentSectionPrompt</div>),
  Card: jest.fn(() => <div>Mocked Card</div>)
}))
const mockDispatch = jest.fn()
const mockState: AppState = {
  researchTopic: 'Mock Research Topic',
  documentSections: [],
  currentChat: null,
  articlesChat: null,
  grantsChat: null,
  frontendSettings: {},
  favoritedCitations: [],
  isSidebarExpanded: false,
  isChatViewOpen: false,
  sidebarSelection: 'option1' as SidebarOptions,
  showInitialChatMessage: true
}
 
const renderComponent = (state = mockState) => {
  return render(
    <AppStateContext.Provider value={{ state, dispatch: mockDispatch }}>
      <DraftDocumentsView />
    </AppStateContext.Provider>
  )
}
 
// Mock necessary imports
jest.mock('file-saver', () => ({
  saveAs: jest.fn()
}))
 
jest.mock('../../api', () => ({
  getUserInfo: jest.fn()
}))
 
describe('DraftDocumentsView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
 
  test('renders DraftDocumentsView with initial state', async () => {
    (api.getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'John Doe' }] }])
 
    renderComponent()
 
    // Check if initial elements are rendered
    expect(screen.getByText(/Draft grant proposal/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Contoso/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/FOA ID/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/FOA Title/i)).toBeInTheDocument()
 
    // Wait for user info to load
    await waitFor(() => { expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument() })
  })
 
  test('handles company input change', () => {
    renderComponent()
    const companyInput = screen.getByPlaceholderText(/Contoso/i)
 
    fireEvent.change(companyInput, { target: { value: 'New Company' } })
    expect(companyInput).toHaveValue('New Company')
  })
 
  test('handles name input change', () => {
    renderComponent()
    const nameInput = screen.getByPlaceholderText(/Name/i)
 
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    expect(nameInput).toHaveValue('New Name')
  })
 
  test('handles FOA ID input change', () => {
    renderComponent()
    const foaIdInput = screen.getByPlaceholderText(/FOA ID/i)
 
    fireEvent.change(foaIdInput, { target: { value: '12345' } })
    expect(foaIdInput).toHaveValue('12345')
  })
 
  test('handles FOA Title input change', () => {
    renderComponent()
    const foaTitleInput = screen.getByPlaceholderText(/FOA Title/i)
 
    fireEvent.change(foaTitleInput, { target: { value: 'New FOA Title' } })
    expect(foaTitleInput).toHaveValue('New FOA Title')
  })
 
  test('opens export dialog on export button click', () => {
    renderComponent()
    const exportButton = screen.getByRole('button', { name: /Export/i })
 
    fireEvent.click(exportButton)
    const dialog = screen.getByRole('dialog', { name: /Export/i })
    expect(dialog).toBeInTheDocument() // Verify that the dialog is present
  })
 
  test('creates Word document when button clicked', async () => {
    (api.getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'John Doe' }] }])
    renderComponent()
    debug()
    // Open export dialog
    const exportButton = screen.findByText(/Export/i)
    fireEvent.click(await exportButton)
 
    // Create Word document
    fireEvent.click(screen.getByText(/Create Word Doc/i))
 
    await waitFor(() => { expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'draft_document.docx') })
  })
 
  test('creates PDF document when button clicked', async () => {
    (api.getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'John Doe' }] }])
 
    renderComponent()
 
    // Open export dialog
    const exportButton = await screen.findByText(/Export/i)
    fireEvent.click(exportButton)
 
    // Ensure the dialog is visible
    const dialog = await screen.findByRole('dialog', { name: /Export/i })
    expect(dialog).toBeInTheDocument() // Check that the dialog opened
 
    // Create PDF document
    fireEvent.click(screen.getByText(/Create PDF/i))
 
    // Wait for saveAs to be called
    await waitFor(() => {
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'draft_document.pdf')
    })
  })
 
  test('handles signature input change', async () => {
    renderComponent() // Replace with your actual component
 
    // Find all inputs with the placeholder "Signature"
    const signatureInputs = screen.getAllByPlaceholderText(/Signature/i)
 
    // Assuming you want to target the first one, adjust as necessary
    const signatureInput = signatureInputs[0]
 
    // Change the value of the input
    fireEvent.change(signatureInput, { target: { value: 'Signature Name' } })
 
    // Assert that the input value has changed
    expect(signatureInput).toHaveValue('Signature Name')
  })
 
  test('handles additional signature input change', () => {
    renderComponent()
 
    const additionalSignatureInput = screen.getByPlaceholderText(/Additional Signature/i)
    fireEvent.change(additionalSignatureInput, { target: { value: 'Additional Signature Name' } })
 
    expect(additionalSignatureInput).toHaveValue('Additional Signature Name')
  })
 
  test('closes export dialog when dismiss button is clicked', async () => {
    renderComponent()
 
    // Open the export dialog
    const exportButton = await screen.findByText(/Export/i)
    fireEvent.click(exportButton)
 
    // Ensure the dialog is visible
    const dialog = await screen.findByRole('dialog', { name: /Export/i })
    expect(dialog).toBeInTheDocument()
 
    // Verify the dialog is no longer in the document
    expect(dialog).not.toBeInTheDocument()
  })
 
  test('fetches user info on mount', async () => {
    (api.getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'John Doe' }] }])
 
    renderComponent() // Render with context
 
    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    })
    expect(api.getUserInfo).toHaveBeenCalledTimes(1)
  })
})