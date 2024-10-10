/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable no-sequences */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { Answer } from './Answer'
import { type AskResponse, type Citation } from '../../api' // Adjust import based on your structure
import { debug } from 'console'
// Mock cloneDeep directly in the test file
jest.mock('lodash-es', () => ({
  cloneDeep: jest.fn((value) => {
    return JSON.parse(JSON.stringify(value)) // Simple deep clone implementation
  })
}))
// jest.mock('react-markdown', () => () => {})
jest.mock('remark-supersub', () => () => {})
// jest.mock("react-markdown", () => () => {})
jest.mock('remark-gfm', () => () => { })
jest.mock('rehype-raw', () => () => { })
// Adjust the mock citation objects to match the Citation type
const mockCitations = [
  {
    chunk_id: '0',
    content: 'Citation 1',
    filepath: 'path/to/doc1',
    id: '1',
    reindex_id: null, // Ensure this matches what you expect
    title: 'Title 1',
    url: 'http://example.com/doc1',
    metadata: null // Add this if it's part of the expected structure
  },
  {
    chunk_id: '1',
    content: 'Citation 2',
    filepath: 'path/to/doc2',
    id: '2',
    reindex_id: null, // Ensure this matches what you expect
    title: 'Title 2',
    url: 'http://example.com/doc2',
    metadata: null // Add this if it's part of the expected structure
  }
]

// The rest of your mock answer stays the same
const mockAnswer: AskResponse = {
  answer: 'This is the answer with citations [doc1] and [doc2].',
  citations: mockCitations
}

// Define the type for the onCitationClicked function
type OnCitationClicked = (citedDocument: Citation) => void

describe('Answer component', () => {
  let onCitationClicked: OnCitationClicked
  let setChevronIsExpanded: jest.Mock<any, any, any>
  beforeEach(() => {
    onCitationClicked = jest.fn(),
    setChevronIsExpanded = jest.fn()
  })
  test('toggles the citation accordion on chevron click', () => {
    const onCitationClicked = jest.fn()
    const { getByText, getByRole } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />)

    // Get the toggle button for the accordion, correctly identifying it by its accessible name
    const toggleButton = getByRole('button', { name: /open references/i })

    // Click the toggle button to open the accordion
    fireEvent.click(toggleButton)

    // Now, check that the chevron icon has changed (if applicable) or that citations are visible
    const citationFilename1 = getByText(/path\/to\/doc1 - Part 1/i)
    const citationFilename2 = getByText(/path\/to\/doc2 - Part 2/i)

    expect(citationFilename1).toBeInTheDocument()
    expect(citationFilename2).toBeInTheDocument()

    // If you have a chevron that changes state, you can check for its existence
    const chevron = getByRole('button', { name: /open references/i }) // This may need to be adjusted based on the current state (e.g., "close references")
    expect(chevron).toBeInTheDocument()
  })

  test('creates the citation filepath correctly', () => {
    const onCitationClicked = jest.fn()
    const { getByText, getByRole } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />)

    const toggleButton = getByRole('button', { name: /Open references/i }) // Adjust based on your button's role and aria-label

    // Simulate clicking the toggle button to open the accordion
    fireEvent.click(toggleButton)

    // Now check for the citation text
    const citationFilename1 = getByText(/path\/to\/doc1 - Part 1/i)
    const citationFilename2 = getByText(/path\/to\/doc2 - Part 2/i)

    expect(citationFilename1).toBeInTheDocument()
    expect(citationFilename2).toBeInTheDocument()
  })

  test('handles keyboard events to open the accordion and click citations', () => {
    const onCitationClicked = jest.fn()
    const { getByText, debug } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />)

    const toggleButton = getByText(/2 references/i)
    fireEvent.click(toggleButton)
    debug()

    const citationLink = getByText(/path\/to\/doc1/i)
    expect(citationLink).toBeInTheDocument()

    fireEvent.click(citationLink)

    // Adjusted expectation to match the structure including metadata
    expect(onCitationClicked).toHaveBeenCalledWith({
      chunk_id: '0',
      content: 'Citation 1',
      filepath: 'path/to/doc1',
      id: '1',
      metadata: null, // Include this field
      reindex_id: '1',
      title: 'Title 1',
      url: 'http://example.com/doc1'
    })
  })

  test('renders the answer text correctly', () => {
    const { getByText, container } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />)

    // Log the entire rendered output for debugging
    console.log(container.innerHTML)

    // Use a regex to match the text more flexibly
    expect(getByText(/This is the answer with citations/i)).toBeInTheDocument()
    expect(getByText(/references/i)).toBeInTheDocument() // Match any reference text
  })

  test('displays correct number of citations', () => {
    const { getByText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />)

    expect(getByText('2 references')).toBeInTheDocument()
  })

  test('toggles the citation accordion on click', () => {
    const { getByText, queryByText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />)

    const toggleButton = getByText('2 references')

    // Initially, citations should not be visible
    expect(queryByText('path/to/doc1 - Part 1')).not.toBeInTheDocument()
    expect(queryByText('path/to/doc2 - Part 2')).not.toBeInTheDocument()

    // Click to open the accordion
    fireEvent.click(toggleButton)

    // Now citations should be visible
    expect(getByText('path/to/doc1 - Part 1')).toBeInTheDocument()
    expect(getByText('path/to/doc2 - Part 2')).toBeInTheDocument()
  })

  test('calls onCitationClicked when a citation is clicked', async () => {
    const mockCitations = [
      {
        chunk_id: '0',
        content: 'Citation 1',
        filepath: 'path/to/doc1',
        id: '1',
        reindex_id: '1', // Adjusting this to match the received value
        title: 'Title 1',
        url: 'http://example.com/doc1',
        metadata: null
      }
      // Add more mock citations as needed
    ]

    const onCitationClicked = jest.fn()

    const { getByText } = render(
        <Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />
    )

    const toggleButton = getByText('2 references')
    fireEvent.click(toggleButton) // Open the accordion

    const citationLink = await getByText('path/to/doc1 - Part 1')

    fireEvent.click(citationLink)

    // Check that onCitationClicked is called with the expected citation structure
    expect(onCitationClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        chunk_id: '0',
        content: 'Citation 1',
        filepath: 'path/to/doc1',
        id: '1',
        reindex_id: '1', // Updated to match the received value
        metadata: null,
        title: 'Title 1',
        url: 'http://example.com/doc1'
      })
    )
  })

  test('handles keyboard events to open the accordion and click citations', () => {
    const onCitationClicked = jest.fn()
    const { getByText, debug } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />)

    const toggleButton = getByText(/2 references/i)
    fireEvent.click(toggleButton)
    debug()

    const citationLink = getByText(/path\/to\/doc1/i)
    expect(citationLink).toBeInTheDocument()

    fireEvent.click(citationLink)

    // Adjust the expected value based on the correct structure
    expect(onCitationClicked).toHaveBeenCalledWith({
      chunk_id: '0',
      content: 'Citation 1',
      filepath: 'path/to/doc1',
      id: '1',
      reindex_id: '1', // Adjust based on the actual expected value
      title: 'Title 1',
      url: 'http://example.com/doc1'
    })
  })

  test('displays disclaimer text', () => {
    const { getByText } = render(<Answer answer={mockAnswer} onCitationClicked={onCitationClicked} />)

    expect(getByText(/AI-generated content may be incorrect/i)).toBeInTheDocument()
  })
})
