// CitationPanel.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CitationPanel from './CitationPanel'
import { type Citation } from '../../api'

jest.mock('remark-gfm', () => jest.fn())
jest.mock('rehype-raw', () => jest.fn())
const mockIsCitationPanelOpen = jest.fn()
const mockOnViewSource = jest.fn()
const mockOnClickAddFavorite = jest.fn()

const mockCitation = {
  id: '123',
  title: 'Sample Citation',
  content: 'This is a sample citation content.',
  url: 'https://example.com/sample-citation',
  filepath: 'path',
  metadata: '',
  chunk_id: '',
  reindex_id: ''
}

describe('CitationPanel', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockIsCitationPanelOpen.mockClear()
    mockOnViewSource.mockClear()
  })

  test('renders CitationPanel with citation title and content', () => {
    render(
            <CitationPanel
            activeCitation={mockCitation}
            onViewSource={mockOnViewSource} setIsCitationPanelOpen={function (flag: boolean): void {
              throw new Error('Function not implemented.')
            } } onClickAddFavorite={function (): void {
              throw new Error('Function not implemented.')
            } } />
    )

    // Check if title is rendered
    expect(screen.getByRole('heading', { name: /Sample Citation/i })).toBeInTheDocument()
  })

  test('renders CitationPanel with citation title and content without url ', () => {
    render(
              <CitationPanel
              activeCitation={{ ...mockCitation, url: null, title: null }}
              onViewSource={mockOnViewSource} setIsCitationPanelOpen={mockIsCitationPanelOpen} onClickAddFavorite={mockOnClickAddFavorite} />
    )

    expect(screen.getByRole('heading', { name: '' })).toBeInTheDocument()
  })

  test('renders CitationPanel with citation title and content includes blob.core in  url ', () => {
    render(
              <CitationPanel
              activeCitation={{ ...mockCitation, url: 'blob.core', title: null }}
              onViewSource={mockOnViewSource} setIsCitationPanelOpen={mockIsCitationPanelOpen} onClickAddFavorite={mockOnClickAddFavorite} />
    )

    expect(screen.getByRole('heading', { name: '' })).toBeInTheDocument()
  })

  test('renders CitationPanel with citation title and content title is null ', () => {
    render(
                <CitationPanel
                activeCitation={{ ...mockCitation, title: null }}
                onViewSource={mockOnViewSource} setIsCitationPanelOpen={mockIsCitationPanelOpen} onClickAddFavorite={mockOnClickAddFavorite} />
    )

    expect(screen.getByRole('heading', { name: 'https://example.com/sample-citation' })).toBeInTheDocument()
  })

  test('calls IsCitationPanelOpen with false when close button is clicked', () => {
    render(
        <CitationPanel
            activeCitation={mockCitation}
            onViewSource={mockOnViewSource} setIsCitationPanelOpen={mockIsCitationPanelOpen} onClickAddFavorite={mockOnClickAddFavorite}/>
    )
    const closeButton = screen.getByRole('button', { name: /Close citations panel/i })
    fireEvent.click(closeButton)

    expect(mockIsCitationPanelOpen).toHaveBeenCalledWith(false)
  })

  test('calls onViewSource with citation when title is clicked', () => {
    render(
        <CitationPanel
            activeCitation={mockCitation}
            setIsCitationPanelOpen={mockIsCitationPanelOpen}
            onViewSource={mockOnViewSource} onClickAddFavorite={mockOnClickAddFavorite}/>
    )

    const title = screen.getByRole('heading', { name: /Sample Citation/i })
    fireEvent.click(title)

    expect(mockOnViewSource).toHaveBeenCalledWith(mockCitation)
  })

  test('renders the title correctly and sets the correct title attribute for non-blob URL', () => {
    render(
        <CitationPanel
            activeCitation={mockCitation} setIsCitationPanelOpen={mockIsCitationPanelOpen} onViewSource={mockOnViewSource} onClickAddFavorite={mockOnClickAddFavorite}
        />
    )

    const titleElement = screen.getByRole('heading', { name: /Sample Citation/i })

    // Ensure the title is rendered
    expect(titleElement).toBeInTheDocument()

    // Ensure the title attribute is set to the URL since it's not a blob URL
    expect(titleElement).toHaveAttribute('title', 'https://example.com/sample-citation')

    // Trigger the onClick event and ensure onViewSource is called with the correct citation
    fireEvent.click(titleElement)
    expect(mockOnViewSource).toHaveBeenCalledWith(mockCitation)
  })

  test('renders the title correctly and sets the title attribute to the citation title for blob URL', () => {
    const mockCitationWithBlobUrl: Citation = {
      ...mockCitation,
      title: 'Test Citation with Blob URL',
      url: 'https://blob.core.example.com/resource',
      content: ''
    }
    render(
        <CitationPanel
            activeCitation={mockCitationWithBlobUrl}
            onViewSource={mockOnViewSource} setIsCitationPanelOpen={mockIsCitationPanelOpen} onClickAddFavorite={mockOnClickAddFavorite}/>
    )

    const titleElement = screen.getByRole('heading', { name: /Test Citation with Blob URL/i })

    // Ensure the title is rendered
    expect(titleElement).toBeInTheDocument()

    // Ensure the title attribute is set to the citation title since the URL contains "blob.core"
    expect(titleElement).toHaveAttribute('title', 'Test Citation with Blob URL')

    // Trigger the onClick event and ensure onViewSource is called with the correct citation
    fireEvent.click(titleElement)
    expect(mockOnViewSource).toHaveBeenCalledWith(mockCitationWithBlobUrl)
  })
})
