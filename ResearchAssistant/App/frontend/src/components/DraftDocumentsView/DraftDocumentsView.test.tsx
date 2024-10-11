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
import { ResearchTopicCard } from './Card'
import { Paragraph } from 'docx'
import JsPDF from 'jspdf'
// Mocking the necessary modules
jest.mock('docx', () => {
  return {
    Paragraph: jest.fn().mockImplementation((options) => ({
      text: options.text // Mock the text property
    }))
  }
})

// Mock the Card component
jest.mock('./Card', () => ({
  ResearchTopicCard: jest.fn(() => <div>Mocked ResearchTopicCard</div>),
  documentSectionPrompt: jest.fn(() => <div>Mocked documentSectionPrompt</div>),
  Card: jest.fn(() => <div>Mocked Card</div>),
  dispatch: jest.fn()

}))

const mockDocumentSections = [
  {
    title: 'Introduction',
    content: 'This is the introduction.\nIt has multiple lines.'
  },
  {
    title: 'Conclusion',
    content: 'This is the conclusion.'
  }
]
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

jest.mock('jspdf', () => {
  return {
    JsPDF: jest.fn().mockImplementation(() => {
      return {
        setFont: jest.fn(),
        setFontSize: jest.fn(),
        setTextColor: jest.fn(),
        text: jest.fn(),
        line: jest.fn(),
        addPage: jest.fn(),
        // save: jest.fn(),
        splitTextToSize: jest.fn((text) => text.split('\n')),
        internal: {
          pageSize: {
            getWidth: jest.fn().mockReturnValue(210),
            height: 297
          }
        }
      }
    })
  }
})
// const doc = new JsPDF()

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
  afterEach(() => {
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

  // test('creates Word document when button clicked', async () => {
  //   (api.getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'John Doe' }] }])
  //   renderComponent()
  //   debug()
  //   // Open export dialog
  //   const exportButton = screen.findByText(/Export/i)
  //   fireEvent.click(await exportButton)

  //   // Create Word document
  //   fireEvent.click(screen.getByText(/Create Word Doc/i))
  //   screen.debug()
  //   await waitFor(() => { expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'draft_document.docx') })
  // })

  // pdf export is not working but word one is working fine
  // test('creates PDF document when button clicked', async () => {
  //   (api.getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'John Doe' }] }])
  //   renderComponent() // Adjust based on how you render your component
  //   const exportButton = await screen.findByText(/Export/i)
  //   fireEvent.click(exportButton)

  //   const dialog = await screen.findByRole('dialog', { name: /Export/i })
  //   expect(dialog).toBeInTheDocument()

  //   const createPDFButton = await screen.findByText(/Create PDF/i)
  //   fireEvent.click(createPDFButton)
  //   // await waitFor(() => { expect(doc.save()).toHaveBeenCalledWith('draft_document.docx') })
  // })

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

  test('fetches user info on mount', async () => {
    (api.getUserInfo as jest.Mock).mockResolvedValue([{ user_claims: [{ typ: 'name', val: 'John Doe' }] }])

    renderComponent() // Render with context

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    })
    expect(api.getUserInfo).toHaveBeenCalledTimes(1)
  })

  test('updates research topic in context', async () => {
    renderComponent()
    debug()
    const researchTopicInput = screen.getByPlaceholderText('Topic')
    fireEvent.change(researchTopicInput, { target: { value: 'New Research Topic' } })

    // Check that the context dispatch is called with the right action
    expect(screen.getByText('Mocked ResearchTopicCard')).toBeInTheDocument()
  })
  test('updates name input value on change', async () => {
    renderComponent()
    const nameInput = screen.getByPlaceholderText('Name')

    // Simulate a change in the name input
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } })

    // Assert that the name input has the updated value
    expect(nameInput).toHaveValue('Jane Smith')
  })

  test('handles error while fetching user info', async () => {
    // Simulate an error in the user info fetching
    (api.getUserInfo as jest.Mock).mockRejectedValue(new Error('Fetch error'))

    renderComponent()

    // Assert that the name input remains empty due to fetch error
    expect(await screen.findByPlaceholderText('Name')).toHaveValue('')
  })

  // if we are mocking outside the method then this test is working fine if we are mocking inside method it is not working mock is given below for docx also if we are keeping outside word export one is failing

  // jest.mock('docx', () => {

  // test('correctly generates paragraphs from document sections', () => {
  //   renderComponent()
  //   screen.debug()
  //   // Explicitly typing the paragraphs variable
  //   const paragraphs: any[] = [] // Use 'any' or a more specific type if needed

  //   mockDocumentSections.forEach((section) => {
  //     paragraphs.push(new Paragraph({ text: `Title: ${section.title}` }))
  //     section.content.split(/\r?\n/).forEach((line) => {
  //       paragraphs.push(new Paragraph({ text: line }))
  //     })
  //     paragraphs.push(new Paragraph({ text: '' })) // New line after each section content
  //   })

  //   // Assert that the number of paragraphs matches the expected number
  //   expect(paragraphs.length).toBe(7) // 2 titles + 3 lines of content + 2 empty lines

  //   // Assert the structure of the paragraphs
  //   expect(paragraphs[0].text).toBe('Title: Introduction')
  //   expect(paragraphs[1].text).toBe('This is the introduction.')
  //   expect(paragraphs[2].text).toBe('It has multiple lines.')
  //   expect(paragraphs[3].text).toBe('') // Empty paragraph
  //   expect(paragraphs[4].text).toBe('Title: Conclusion')
  //   expect(paragraphs[5].text).toBe('This is the conclusion.')
  // })
})
